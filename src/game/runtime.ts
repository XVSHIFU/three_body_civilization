import packageInfo from '../../package.json';
import assetManifest from '../../content/assets/manifest.json';
import {environmentSky,interpolateSky} from '../simulation/sky';
import {PositionInterpolation} from '../renderer/position-interpolation';
import {interactionTarget} from '../renderer/interaction-ray';
import type {InteractionContext} from '../gameplay/interaction';
import {insideFacility,canStartPreservation} from '../gameplay/facility-access';
import {NpcAnimationCadence} from '../renderer/npc-cadence';
import {AnomalySignal} from '../gameplay/anomaly';
import {npcObservation,idlePhase} from '../renderer/npc-observation';
import {BUILD_ID,RUNTIME_ID} from '../build-info';
import {AdaptiveResolution,renderRatio} from '../renderer/resolution';
import {moveNpc,shelterRoute,shelterWaypointReached} from '../gameplay/npc-movement';
import {createNpcAppearance} from '../renderer/npc-appearance';
import {PerformanceCapture} from './performance';
import {WorldAudio} from './audio';
import {InstrumentShadows} from '../renderer/instrument-shadows';
import {ShadowSelector} from '../renderer/shadow';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {GameClock,type PauseReason} from './clock';
import {PlayerController} from '../player/controller';
import {createWorld,type Interactable} from '../renderer/world';
import {advanceEnvironment} from '../simulation/environment';
import {scenario as defaultScenario} from '../simulation/scenario';
import type {Scenario} from '../simulation/core';
import {initialState,type SunView,type CelestialState} from '../simulation/core';
import {freshPreservation,stepPreservation,beginPreservation,cancelPreservation,outcome,type Preservation} from '../gameplay/preservation';
import {sample,locationName,type Observation} from '../gameplay/evidence';
import type {Settings,Checkpoint} from '../storage/archive';
import {loadAssets,disposeAssets,type AssetLibrary} from '../renderer/assets';
export interface RuntimeView {anomalyCaption?:boolean;paused:boolean;reasons:string[];feeling:string;location:string;target:string|null;preservation:string;warning:boolean;tick:number;position:number[];grounded:boolean;drawCalls:number;triangles:number;frameMs:number}
export interface RuntimeCallbacks {view:(view:RuntimeView)=>void;interact:(target:Interactable,sample:Observation|null)=>void;error:(message:string)=>void;ended:(checkpoint:Checkpoint)=>void;checkpoint:(checkpoint:Checkpoint)=>void;journal:()=>void;pause:()=>void}
export class GameRuntime {
 releasedResources:ReturnType<GameRuntime['resourceSnapshot']>|null=null;
 retiredContextLost=false;
 readonly clock=new GameClock();readonly scene=new THREE.Scene();readonly camera=new THREE.PerspectiveCamera(65,1,.1,350);
 private renderer:THREE.WebGLRenderer;private physics!:RAPIER.World;private player!:PlayerController;private world!:ReturnType<typeof createWorld>;private disposed=false;
 private celestial:CelestialState;private celestialAccumulator=0;private temperature=28;private heatLoad=0;private dangerDuration=0;private warning=false;private ended=false;private preservation:Preservation=freshPreservation();
 private yaw=0;private pitch=0;private keys=new Set<string>();private last=0;private lastPublish=0;private target:Interactable|null=null;private candidate:string|null=null;private candidateSince=0;private safePosition=[0,.9,64];private frames:number[]=[];private rays=new THREE.Raycaster();
 private cameraPosition=new PositionInterpolation();
 private instrumentShadows!:InstrumentShadows;
 private resolution:AdaptiveResolution;private capture=new PerformanceCapture();private previousFrameActive=false;
 private shadowSelector=new ShadowSelector();
 private lights:THREE.DirectionalLight[]=[];private suns:THREE.Mesh[]=[];private abort=new AbortController();private observer:ResizeObserver;private context:AudioContext|null=null;private audio:WorldAudio|null=null;private footstepDistance=0;
 private skyPrevious:SunView[]=[];private skyCurrent:SunView[]=[];
 private anomaly=new AnomalySignal();
 private npcSky=new Map<number,SunView|null>();
 private assets:AssetLibrary=new Map();private npcMixers:{cadence:NpcAnimationCadence;mixer:THREE.AnimationMixer;current:string;actions:Record<string,THREE.AnimationAction>;root:THREE.Object3D}[]=[];
 constructor(private container:HTMLElement,private settings:Settings,private civilization:number,private callbacks:RuntimeCallbacks,private scenario:Scenario=defaultScenario){
  this.celestial=initialState(scenario);this.temperature=scenario.climate.base;
  this.resolution=new AdaptiveResolution(settings.quality);this.camera.fov=settings.fov;this.camera.updateProjectionMatrix();
  const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2',{antialias:true,powerPreference:'high-performance'});if(!context)throw Error('此设备未能创建 WebGL2 场景。你仍可阅读玩法说明、查看或导出档案；请在支持 WebGL2 的桌面浏览器中游玩。');
  this.renderer=new THREE.WebGLRenderer({canvas,context});this.renderer.shadowMap.enabled=settings.quality!=='low';this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.setClearColor(0x8d9fa7);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;container.appendChild(this.renderer.domElement);
  this.scene.fog=new THREE.Fog(0x8d9fa7,65,220);this.scene.add(new THREE.HemisphereLight(0xb8d3df,0x756448,2));
  for(let i=0;i<3;i++){const light=new THREE.DirectionalLight([0xffedce,0xffdcc0,0xffeedb][i],0);light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:130});light.shadow.bias=-.0004;this.scene.add(light,light.target);this.lights.push(light);const disk=new THREE.Mesh(new THREE.SphereGeometry(1.1,16,12),new THREE.MeshBasicMaterial({color:[0xfff0d2,0xffdab8,0xfff5e3][i],fog:false}));this.scene.add(disk);this.suns.push(disk);}
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();this.bind();
 }
 async initialize(progress:(label:string)=>void,checkpoint:Checkpoint|null){progress('初始化碰撞模块');try{await RAPIER.init();}catch(cause){throw Error('物理引擎未能启动。请重试初始化；若仍失败，请在支持 WebAssembly 的桌面浏览器中重新打开。你仍可阅读玩法说明或导出当前档案。',{cause});}if(this.disposed)return;this.assets=await loadAssets(progress);if(this.disposed){disposeAssets(this.assets);return;}this.physics=new RAPIER.World({x:0,y:-9.81,z:0});progress('构建地面、台阶和交互对象');this.world=createWorld(this.scene,this.physics,this.assets);this.instrumentShadows=new InstrumentShadows(this.scene);this.player=new PlayerController(this.physics);this.physics.step();
  const npcAsset=this.assets.get('npc')!;for(const npc of this.world.npcs){npc.group.children.forEach(child=>child.visible=false);const root=createNpcAppearance(npcAsset.scene,npc.index);npc.group.add(root);const mixer=new THREE.AnimationMixer(root),actions=Object.fromEntries(npcAsset.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));actions.preserve.setLoop(THREE.LoopOnce,1);actions.preserve.clampWhenFinished=true;actions.idle.play();actions.idle.time=idlePhase(npc.index,actions.idle.getClip().duration);mixer.update(0);this.npcMixers.push({cadence:new NpcAnimationCadence(),mixer,actions,current:'idle',root});}
  const ruler=this.assets.get('ruler_cube')!.scene.clone(true);ruler.position.set(3,0,61);this.scene.add(ruler);this.physics.createCollider(RAPIER.ColliderDesc.cuboid(.5,.5,.5).setTranslation(3,.5,61));
  if(checkpoint){if(checkpoint.runtimeId!==RUNTIME_ID||checkpoint.scenarioId!==this.scenario.id||checkpoint.scenarioVersion!==this.scenario.version||checkpoint.integratorVersion!==this.scenario.integratorVersion)throw Error('检查点场景版本不同，请导出档案后选择新文明。');this.clock.tick=checkpoint.tick;this.celestial=structuredClone(checkpoint.celestial);this.celestialAccumulator=checkpoint.celestialAccumulator??0;this.temperature=checkpoint.temperature;this.heatLoad=checkpoint.heatLoad;this.dangerDuration=checkpoint.dangerDuration;this.warning=checkpoint.warning;this.anomaly=new AnomalySignal(checkpoint.anomalyTick??null);this.preservation={...checkpoint.preservation};this.yaw=checkpoint.yaw;this.pitch=checkpoint.pitch;this.player.setPosition(...checkpoint.position);this.ended=checkpoint.ended;
   if(checkpoint.motion){this.player.verticalSpeed=checkpoint.motion.verticalSpeed;this.player.grounded=checkpoint.motion.grounded;this.safePosition=[...checkpoint.motion.safePosition];}
   checkpoint.npcs?.forEach((saved,i)=>{const npc=this.world.npcs[i];if(!npc)return;npc.group.position.set(...saved.position);npc.group.rotation.y=saved.yaw;npc.state=saved.state;npc.waypoint=saved.waypoint;npc.preserveElapsed=saved.preserveElapsed??(saved.state==='preserved'?3:0);npc.group.visible=npc.preserveElapsed<3;if(saved.state==='preserved'){const actor=this.npcMixers[i];actor.actions.idle.stop();actor.actions.preserve.play();actor.actions.preserve.time=npc.preserveElapsed;actor.current='preserve';actor.mixer.update(0);const opacity=1-Math.max(0,npc.preserveElapsed-2);actor.root.traverse(o=>{if(o instanceof THREE.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){material.transparent=opacity<1;material.opacity=opacity;}});}});}
  progress('编译场景材质');await this.renderer.compileAsync(this.scene,this.camera);if(this.disposed)return;this.clock.clear('loading');if(this.ended){this.clock.pause('result');this.world.setDestroyed(true);}this.updateSky();this.cameraPosition.reset(this.player.eye);this.syncCamera();this.renderer.setAnimationLoop(this.frame);this.publish();progress('已就绪');
 }
 private bind(){const options={signal:this.abort.signal};document.addEventListener('keydown',this.keydown,options);document.addEventListener('keyup',e=>this.keys.delete(e.code),options);document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==this.renderer.domElement||this.clock.paused)return;this.yaw-=e.movementX*.002*this.settings.sensitivity;this.pitch=Math.max(-85*Math.PI/180,Math.min(85*Math.PI/180,this.pitch-e.movementY*.002*this.settings.sensitivity));},options);
  document.addEventListener('pointerlockchange',()=>{this.keys.clear();if(document.pointerLockElement===this.renderer.domElement){this.clock.clear('pointerUnlocked');this.clock.clear('focusLost');this.clock.clear('menu');}else{this.clock.pause('pointerUnlocked');this.callbacks.pause();}this.publish();},options);
  document.addEventListener('pointerlockerror',()=>{this.pause('pointerUnlocked');this.callbacks.error('浏览器未允许鼠标锁定。请点击继续重试，或检查浏览器权限。');},options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.pause('hidden');this.callbacks.checkpoint(this.checkpoint());}else{this.clock.clear('hidden');this.clock.pause('pointerUnlocked');}this.publish();},options);
  window.addEventListener('blur',()=>this.pause('focusLost'),options);this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.pause('contextLost');this.callbacks.checkpoint(this.checkpoint());this.callbacks.error('图形上下文丢失，世界已暂停。可保留当前进度并重建场景，或先导出档案。');},options);
 }
 private keydown=(e:KeyboardEvent)=>{if(e.repeat||e.isComposing||e.ctrlKey||e.metaKey||e.altKey||(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable]')))return;if(e.code==='Escape'){this.pause('menu');this.callbacks.pause();return;}if(this.clock.paused)return;const k=this.settings.keys;if(e.code===k.journal){e.preventDefault();this.pause('menu');this.callbacks.journal();return;}if(e.code===k.interact){e.preventDefault();this.interact();return;}if(Object.values(k).includes(e.code)||e.code==='ShiftLeft'){e.preventDefault();this.keys.add(e.code);}};
 async resume(){if(this.disposed||this.ended||document.hidden)return;try{const permission=this.renderer.domElement.requestPointerLock();try{this.context??=new AudioContext();this.audio??=new WorldAudio(this.context);void this.context.resume().catch(()=>{});}catch{/* Silent play remains available. */}await permission;}catch(error){console.warn('Pointer Lock request failed',error);this.callbacks.error('未能锁定鼠标。请再次点击继续；世界保持暂停。');}}
 pause(reason:PauseReason='menu'){this.previousFrameActive=false;this.resolution.interrupt();this.clock.pause(reason);if(this.player)this.cameraPosition.reset(this.player.eye);this.keys.clear();if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();this.publish();}
 /** Developer diagnostic: the browser extension generates the real context-lost event. */
 simulateContextLoss(){if(this.disposed||!this.player||this.renderer.getContext().isContextLost())return false;const extension=this.renderer.getContext().getExtension('WEBGL_lose_context');if(!extension)return false;extension.loseContext();return true;}
 private frame=(now:number)=>{if(this.disposed||!this.player)return;const rawDt=this.last?(now-this.last)/1000:0,dt=Math.min(rawDt,.1),wasActive=!this.clock.paused,captureEligible=wasActive&&this.previousFrameActive;this.last=now;this.frames.push(rawDt*1000);if(this.frames.length>300)this.frames.shift();try{this.clock.advance(dt,this.fixedStep);this.audio?.update(this.settings.volume,this.heatLoad,this.clock.paused,this.settings.bassVolume);if(this.clock.paused)this.cameraPosition.reset(this.player.eye);this.detectTarget(now);this.syncCamera(true);this.renderSky();this.renderer.render(this.scene,this.camera);if(captureEligible){const p=this.player.body.translation();this.capture.add({milliseconds:rawDt*1000,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,tick:this.clock.tick,position:[p.x,p.y,p.z]});}if(captureEligible){if(this.resolution.sample(rawDt*1000))this.resize();}else this.resolution.interrupt();this.previousFrameActive=wasActive&&!this.clock.paused;if(now-this.lastPublish>=100){this.lastPublish=now;this.publish();}}catch(e){this.pause('error');this.callbacks.error(String(e));}};
 private fixedStep=(dt:number)=>{
  const k=this.settings.keys,forward=Number(this.keys.has(k.forward))-Number(this.keys.has(k.back)),right=Number(this.keys.has(k.right))-Number(this.keys.has(k.left)),norm=Math.hypot(forward,right)||1,speed=this.keys.has('ShiftLeft')?5.8:4.2,locked=!['idle','preparing'].includes(this.preservation.phase);
  const beforeMove=this.player.body.translation(),wasGrounded=this.player.grounded,fallSpeed=this.player.verticalSpeed;
  this.player.move(locked?0:(right*Math.cos(this.yaw)-forward*Math.sin(this.yaw))*speed/norm,locked?0:(-right*Math.sin(this.yaw)-forward*Math.cos(this.yaw))*speed/norm,dt);this.physics.step();this.cameraPosition.record(this.player.eye);
  const pos=this.player.body.translation();if(pos.y < -8){this.pause('error');this.callbacks.error('你已离开可走区域，可回到最近安全点；观测记录保留。');return;}if(this.player.grounded&&this.clock.tick%60===0)this.safePosition=[pos.x,pos.y,pos.z];
  if(this.player.grounded){
   this.footstepDistance+=Math.hypot(pos.x-beforeMove.x,pos.z-beforeMove.z);
   if(this.footstepDistance>=1.8){this.footstepDistance%=1.8;this.audio?.cue('step');}
   if(!wasGrounded&&fallSpeed<-2)this.audio?.cue('step');
  }
  const wasWarning=this.warning;
  const environment=advanceEnvironment({celestial:this.celestial,celestialAccumulator:this.celestialAccumulator,temperature:this.temperature,heatLoad:this.heatLoad,dangerDuration:this.dangerDuration,warning:this.warning},dt,this.scenario);
  this.celestial=environment.celestial;this.celestialAccumulator=environment.celestialAccumulator;this.temperature=environment.temperature;this.heatLoad=environment.heatLoad;this.dangerDuration=environment.dangerDuration;this.warning=environment.warning;
  if(this.warning&&!wasWarning)this.audio?.cue('bell');
  if(this.preservation.phase==='preparing'&&!insideFacility(pos))this.preservation=cancelPreservation(this.preservation);
  const previousPhase=this.preservation.phase;this.preservation=stepPreservation(this.preservation,dt,this.heatLoad,this.scenario.climate.facilityLimit);
  if(this.preservation.phase!==previousPhase)this.audio?.cue('facility');

  this.updateSky(dt);this.updateNpcs(dt);if(!this.warning&&this.anomaly.update(this.clock.tick,this.world.npcs.some(n=>n.state==='observe'))){this.audio?.cue('bell');this.callbacks.checkpoint(this.checkpoint());}this.npcMixers.forEach((actor,i)=>{const state=this.world.npcs[i].state,name=state==='shelter'?'panic':state==='preserved'?'preserve':state;const action=actor.actions[name];if(action&&actor.current!==name){actor.mixer.update(actor.cadence.take(0,0,true));actor.actions[actor.current]?.fadeOut(.12);action.reset().fadeIn(.12).play();if(name==='idle')action.time=idlePhase(i,action.getClip().duration);actor.current=name;}if(action)action.timeScale=state==='shelter'?this.world.npcs[i].movementSpeed/2:1;const elapsed=actor.cadence.take(dt,Math.hypot(this.world.npcs[i].group.position.x-pos.x,this.world.npcs[i].group.position.y-pos.y,this.world.npcs[i].group.position.z-pos.z),state==='shelter'||state==='preserved');if(elapsed>0&&this.world.npcs[i].group.visible)actor.mixer.update(elapsed);});
  if(this.dangerDuration>=this.scenario.climate.cityLimit){this.audio?.cue('ending');this.ended=true;this.world.setDestroyed(true);this.pause('result');this.callbacks.ended(this.checkpoint());}
  else if(this.clock.tick>0&&this.clock.tick%1200===0)this.callbacks.checkpoint(this.checkpoint());
 };
 private syncCamera(interpolate=false){if(!this.player)return;const p=interpolate?this.cameraPosition.at(this.clock.interpolationAlpha):this.player.eye;this.camera.position.set(p.x,p.y,p.z);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
 private updateSky(dt=0){this.world.setTemperature(this.temperature);const views=environmentSky(this.celestial,this.celestialAccumulator,this.scenario);this.skyPrevious=this.skyCurrent.length?this.skyCurrent:views;this.skyCurrent=views;this.shadowSelector.update(views.map(v=>v.irradiance*Math.max(0,v.direction[1])),dt);
  const heat=THREE.MathUtils.clamp((this.temperature-32)/42,0,1),sky=new THREE.Color(0x8d9fa7).lerp(new THREE.Color(0xb37755),heat);this.renderer.setClearColor(sky);(this.scene.fog as THREE.Fog).color.copy(sky);
 }
 private renderSky(){if(this.clock.paused)this.skyPrevious=this.skyCurrent;const views=interpolateSky(this.skyPrevious,this.skyCurrent,this.clock.interpolationAlpha),shadow=this.shadowSelector;
  views.forEach((v,i)=>{const light=this.lights[i],p=this.camera.position;light.intensity=v.aboveHorizon?Math.min(2.5,v.irradiance*60):0;light.position.set(p.x+v.direction[0]*60,p.y+v.direction[1]*60,p.z+v.direction[2]*60);light.target.position.set(p.x,0,p.z);light.castShadow=i===shadow.source&&this.settings.quality!=='low';light.shadow.intensity=shadow.strength;const sun=this.suns[i];sun.visible=v.aboveHorizon;sun.position.set(p.x+v.direction[0]*180,p.y+v.direction[1]*180,p.z+v.direction[2]*180);});
  this.instrumentShadows?.update(views,this.world.solid);

 }
 private updateNpcs(dt:number){
  const sky=environmentSky(this.celestial,this.celestialAccumulator,this.scenario);
  this.world.npcs.forEach(n=>{
   n.movementSpeed=0;
   const playerPosition=this.player.body.translation(),thoughtInterval=Math.hypot(n.group.position.x-playerPosition.x,n.group.position.z-playerPosition.z)>40?24:6;
   if(!this.warning&&n.state!=='preserved'&&(this.clock.tick%thoughtInterval===n.index%thoughtInterval||!this.npcSky.has(n.index)))this.npcSky.set(n.index,npcObservation(n.group.position,sky,this.world.solid));
   const visible=this.npcSky.get(n.index);
   if(this.warning&&n.state!=='preserved')n.state='shelter';else if(!this.warning&&n.state!=='preserved')n.state=visible?'observe':'idle';
   if(n.state==='observe'){

    if(visible){const desired=Math.atan2(visible.direction[0],visible.direction[2]),difference=Math.atan2(Math.sin(desired-n.group.rotation.y),Math.cos(desired-n.group.rotation.y));n.group.rotation.y+=THREE.MathUtils.clamp(difference,-dt,dt);}
   }
   if(n.state==='preserved'){
    n.preserveElapsed=Math.min(3,n.preserveElapsed+dt);n.group.visible=n.preserveElapsed<3;
    const opacity=1-Math.max(0,n.preserveElapsed-2);
    this.npcMixers[n.index].root.traverse(o=>{if(o instanceof THREE.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material]){material.transparent=opacity<1;material.opacity=opacity;}});
   }
   if(n.state==='shelter'){
    const path=shelterRoute(n.index).map(point=>new THREE.Vector3(point.x,0,point.z));
    const destination=path[n.waypoint],d=destination.clone().sub(n.group.position),distance=d.length();
    if(shelterWaypointReached(distance,n.waypoint)){if(n.waypoint<path.length-1)n.waypoint++;else{n.state='preserved';n.preserveElapsed=0;}}
    else{const speed=2;const next=n.group.position.clone().addScaledVector(d.normalize(),Math.min(distance,dt*speed));const player=this.player.body.translation();const avoided=moveNpc(this.physics,n.group.position,next,player,dt,this.world.npcs.filter(other=>other!==n&&other.group.visible).map(other=>other.group.position));next.x=avoided.x;next.z=avoided.z;n.movementSpeed=next.distanceTo(n.group.position)/dt;const heading=n.movementSpeed>1e-4?Math.atan2(next.x-n.group.position.x,next.z-n.group.position.z):n.group.rotation.y;n.group.position.copy(next);const desired=heading,difference=Math.atan2(Math.sin(desired-n.group.rotation.y),Math.cos(desired-n.group.rotation.y));n.group.rotation.y+=THREE.MathUtils.clamp(difference,-dt*2,dt*2);}
   }
  });
 }

 private currentTarget(){this.syncCamera();this.camera.updateMatrixWorld(true);this.rays.setFromCamera(new THREE.Vector2(0,0),this.camera);this.rays.far=2.5;return interactionTarget(this.rays,this.world.solid,this.world.interactables,this.interactionContext());}
 private detectTarget(now:number){if(this.clock.paused)return;const hit=this.currentTarget(),id=hit?.stableId??null;if(id!==this.candidate){this.candidate=id;this.candidateSince=now;}if(now-this.candidateSince>100)this.target=hit;}
 private interactionContext():InteractionContext {return {ended:this.ended,preservationPhase:this.preservation.phase,dispatch:(id)=>{const target=this.world.interactables.find(item=>item.stableId===id);if(target)this.openInteraction(target);}};}
 interact(){if(this.clock.paused||!this.target)return;if(this.currentTarget()?.stableId!==this.target.stableId){this.target=null;return;}this.target.execute(this.target.actions[0].id,this.interactionContext());}
 private openInteraction(target:Interactable){let observation:Observation|null=null;if(target.kind==='pillar'||target.kind==='thermometer'){const bounds=new THREE.Box3().setFromObject(target.object),origin=target.observationOrigin?.()??bounds.getCenter(new THREE.Vector3()).setY(bounds.max.y+.15);const visible=environmentSky(this.celestial,this.celestialAccumulator,this.scenario).filter(s=>{if(s.direction[1]<=.025)return false;const ray=new THREE.Raycaster(origin,new THREE.Vector3(...s.direction),.1,250);return !ray.intersectObjects(this.world.solid.filter(m=>m!==target.object),false).length;});observation=sample(this.civilization,this.clock.tick,target.kind,visible,this.temperature,{instrumentId:target.stableId,instrumentName:target.displayName,name:locationName(origin),position:[origin.x,origin.y,origin.z]});}this.audio?.cue('instrument');this.pause('menu');this.callbacks.interact(target,observation);}
 preserve(){if(this.target?.kind!=='facility'||this.preservation.phase!=='idle')return;if(!this.target.canInteract(this.interactionContext())||!canStartPreservation(this.player.body.translation(),this.player.eye,this.target.object,this.world.solid)){this.callbacks.error('请进入保存设施，靠近可见的操作台后重新确认。');return;}this.preservation=beginPreservation(this.preservation);void this.resume();}
 cancelPreserve(){this.preservation=cancelPreservation(this.preservation);this.publish();}
 recover(){this.player.setPosition(this.safePosition[0],this.safePosition[1],this.safePosition[2]);this.cameraPosition.reset(this.player.eye);this.clock.clear('error');this.clock.pause('pointerUnlocked');this.publish();}
 setSettings(settings:Settings){if(settings.quality!==this.settings.quality)this.resolution=new AdaptiveResolution(settings.quality);this.settings=settings;this.camera.fov=settings.fov;this.camera.updateProjectionMatrix();this.renderer.shadowMap.enabled=settings.quality!=='low';this.resize();}
 private resize(){const w=this.container.clientWidth||1,h=this.container.clientHeight||1;this.renderer.setPixelRatio(renderRatio(w,h,window.devicePixelRatio,this.settings.quality,this.resolution.scale));this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 resourceSnapshot(){const memory=(performance as Performance & {memory?:{usedJSHeapSize:number}}).memory;return {geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,programs:this.renderer.info.programs?.length??0,heapBytes:memory?.usedJSHeapSize??null};}
 cleanupSnapshot(){return {disposed:this.disposed,listenersAborted:this.abort.signal.aborted,canvasConnected:this.renderer.domElement.isConnected,retiredContextLost:this.retiredContextLost,releasedResources:this.releasedResources};}
 startPerformanceCapture(){this.capture.start();this.previousFrameActive=false;}
 performanceReport(){const gl=this.renderer.getContext();return{...this.capture.report(),buildVersion:BUILD_ID,runtimeVersion:RUNTIME_ID,dependencies:packageInfo.dependencies,modelResources:assetManifest.map(({id,bytes,sha256})=>({id,bytes,sha256})),renderCounterScope:'Three.js 0.186.1 single renderer.render call: counter reset precedes shadow rendering; shadow and main passes included. No postprocessing passes configured.',entryScripts:Array.from(document.scripts).map(s=>s.src).filter(Boolean),scenario:structuredClone(this.scenario),quality:this.settings.quality,adaptiveResolution:{scale:this.resolution.scale,changes:[...this.resolution.changes]},browser:navigator.userAgent,gpu:gl.getParameter(gl.RENDERER),viewport:{width:this.container.clientWidth,height:this.container.clientHeight,dpr:window.devicePixelRatio,renderRatio:this.renderer.getPixelRatio()},scope:'90 seconds of active rendered frame intervals; loading and paused time excluded, long active frames retained. Device class and fixed-route adherence require manual verification.'};}
 checkpoint():Checkpoint {const p=this.player?.body.translation()??{x:0,y:.9,z:64};return{anomalyTick:this.anomaly.firstTick,runtimeId:RUNTIME_ID,scenarioId:this.scenario.id,scenarioVersion:this.scenario.version,integratorVersion:this.scenario.integratorVersion,tick:this.clock.tick,celestial:structuredClone(this.celestial),celestialAccumulator:this.celestialAccumulator,motion:{verticalSpeed:this.player?.verticalSpeed??0,grounded:this.player?.grounded??false,safePosition:[...this.safePosition] as [number,number,number]},npcs:this.world?.npcs.map(n=>({position:n.group.position.toArray() as [number,number,number],yaw:n.group.rotation.y,state:n.state,waypoint:n.waypoint,preserveElapsed:n.preserveElapsed}))??[],temperature:this.temperature,heatLoad:this.heatLoad,dangerDuration:this.dangerDuration,warning:this.warning,position:[p.x,p.y,p.z],yaw:this.yaw,pitch:this.pitch,preservation:{...this.preservation},ended:this.ended,outcome:this.ended?outcome(this.preservation,true,0):null};}
 private publish(){if(this.disposed)return;const p=this.player?.body.translation()??{x:0,y:0,z:64};this.callbacks.view({anomalyCaption:this.anomaly.captionVisible(this.clock.tick),paused:this.clock.paused,reasons:[...this.clock.pauseReasons],feeling:this.temperature>54?'灼热，尽快进入设施':this.temperature>39?'空气正在变热':'尚可',location:locationName(p),target:this.target?.displayName??null,preservation:this.preservation.phase,warning:this.warning,tick:this.clock.tick,position:[p.x,p.y,p.z],grounded:this.player?.grounded??false,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,frameMs:this.frames.length?this.frames.reduce((a,b)=>a+b,0)/this.frames.length:0});}
 dispose(){if(this.disposed)return;this.disposed=true;this.renderer.setAnimationLoop(null);this.abort.abort();this.observer.disconnect();if(document.pointerLockElement===this.renderer.domElement)document.exitPointerLock();this.keys.clear();this.audio?.dispose();void this.context?.close();this.npcMixers.forEach(a=>{a.mixer.stopAllAction();a.mixer.uncacheRoot(a.root);});disposeAssets(this.assets,[this.scene]);this.player?.dispose();this.physics?.free();this.releasedResources=this.resourceSnapshot();this.renderer.dispose();this.renderer.forceContextLoss();this.retiredContextLost=this.renderer.getContext().isContextLost();this.renderer.domElement.remove();}
}














