import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {PlayerController} from '../player/controller';
import {PositionInterpolation} from '../renderer/position-interpolation';
import {disposeResources} from '../renderer/dispose-resources';
import {CourtyardSession,type Panel} from './session';
import {createCourtyard,spawn,type CourtyardTarget} from './scene';
import '@fontsource/noto-serif-sc/chinese-simplified-400.css';
import './styles.css';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const panel=$<HTMLDialogElement>('panel'),body=$('panel-body'),actions=$('panel-actions'),title=$('panel-title'),host=$('scene');
const state=new CourtyardSession(),keys=new Set<string>(),abort=new AbortController();
const viewPosition=new PositionInterpolation(),movement=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
let needsRender=true;
let renderer:THREE.WebGLRenderer,physics:RAPIER.World,player:PlayerController,world:Awaited<ReturnType<typeof createCourtyard>>;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(62,1,.08,220);camera.rotation.order='YXZ';camera.rotation.set(.10,-.38,0);
const ray=new THREE.Raycaster();let target:CourtyardTarget|undefined,last=0,notifyTimer:ReturnType<typeof setTimeout>,pending=false,disposed=false;
let lightMode='dual',fontScale=1;const records:{tick:number;light:string;angles:number[]}[]=[];
const suns:THREE.Mesh[]=[],lights:THREE.DirectionalLight[]=[];
function notify(text:string){$('notification').textContent=text;clearTimeout(notifyTimer);notifyTimer=setTimeout(()=>$('notification').textContent='',4000);}
function pause(){keys.clear();if(player)viewPosition.reset(player.eye);if(document.pointerLockElement===renderer?.domElement)document.exitPointerLock();}
function button(label:string,fn:()=>void,primary=false){const b=document.createElement('button');b.textContent=label;b.className=primary?'primary':'';b.onclick=fn;actions.append(b);return b;}
function open(next:Exclude<Panel,null>){state.open(next);pause();drawPanel();}
function escape(){state.escape();pause();drawPanel();}
function readings(){return suns.filter(s=>s.visible).map(s=>Math.asin(s.position.clone().normalize().y)*180/Math.PI);}
function drawPanel(){
 needsRender=true;
 document.body.dataset.state=state.panel??'playing';$('target').hidden=!!state.panel||!target;
 if(!state.panel){panel.close();return;}if(!panel.open)panel.showModal();body.replaceChildren();actions.replaceChildren();$('close').hidden=state.panel==='loading'||state.panel==='welcome'||state.panel==='error';
 const content=(heading:string,html:string)=>{title.textContent=heading;body.innerHTML=html;};
 switch(state.panel){
 case 'loading':content('观象庭院','<p>正在准备石阶、仪器与观测员…</p>');break;
 case 'welcome':content('观象庭院','<p class="reading">沿石阶走近观象仪，读一读庭院留下的记录。</p><p class="quiet">可自由行走的品质样板。光照为检查场景，本页记录只保留到关闭页面。</p><dl class="controls"><dt>W A S D</dt><dd>行走 · Shift 快走</dd><dt>鼠标</dt><dd>观察四周</dd><dt>E</dt><dd>近处交互</dd><dt>J / Esc</dt><dd>日志 / 暂停</dd></dl>');button('进入庭院',()=>void resume(),true);button('设置',()=>open('settings'));break;
 case 'pause':content('世界已暂停','<p>准备好后，继续你的观测。</p>');button('继续探索',()=>void resume(),true);button('设置',()=>open('settings'));button('观测日志',()=>open('journal'));{const a=document.createElement('a');a.href='./';a.textContent='返回原型首页';actions.append(a);}break;
 case 'settings':content('设置','<label class="setting">检查光照<select id="light"><option value="normal">常态 · 单日</option><option value="dual">双日</option><option value="disaster">灾变</option></select></label><label class="setting">界面字号 <input id="font" aria-label="界面字号" type="range" min="1" max="1.5" step="0.1"></label><p class="quiet">三种固定光照用于检查可读性，不推进正式天体模拟。</p>');$<HTMLSelectElement>('light').value=lightMode;$<HTMLSelectElement>('light').onchange=e=>{lightMode=(e.target as HTMLSelectElement).value;setLighting();};$<HTMLInputElement>('font').value=String(fontScale);$<HTMLInputElement>('font').oninput=e=>{fontScale=+(e.target as HTMLInputElement).value;document.documentElement.style.setProperty('--font-scale',String(fontScale));};button('返回',()=>{state.panel=state.settingsOrigin;drawPanel();},true);break;
 case 'plaque':content('观天 · 知行','<p class="reading">天象不会因我们的愿望停留。</p><p>先记下太阳所在的方向，再比较下一次观测。一次平静，不足以说明长久的规律。</p><p class="quiet">石牌旁的台阶通向观象仪。</p>');button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;
 case 'observer':content('观测员','<p class="reading">“我把每一次观测都留下。即使判断错了，记录也能告诉后来的人，我们究竟看见过什么。”</p><p>他指了指石阶上的仪器，又低头核对手中的图册。</p>');button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;
 case 'instrument':{const angles=readings();content('观象仪',`<p>从瞄准台读取当前可见光源的高度。</p><div class="sample-readings">${angles.map((a,i)=>`<div>光源 ${i+1}<strong>${a.toFixed(1)}°</strong></div>`).join('')}</div><p class="quiet">固定检查光照的实测方向，不写入正式文明档案。</p>`);button('记录本次观测',()=>{if(!records.some(r=>r.tick===state.clock.tick&&r.light===lightMode)){records.push({tick:state.clock.tick,light:lightMode,angles});notify('已记入本页观测日志。');}else notify('本次观测已记录。');});button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;}
 case 'journal':content('观测日志',records.length?records.map((r,i)=>`<article class="log-entry"><strong>观测 ${i+1} · ${r.light==='dual'?'双日':r.light==='normal'?'常态':'灾变'}检查光照</strong><p>${r.angles.map((a,j)=>`光源${j+1}高度 ${a.toFixed(1)}°`).join(' ／ ')}</p></article>`).join(''):'<p class="reading">还没有留下观测。</p><p>走上石阶，靠近观象仪的瞄准台，按 E 读取并记录。</p>');button(state.readingOrigin===null?'返回场景':'返回暂停',returnToScene,true);break;
 case 'error':content('庭院暂时无法继续','<p id="failure"></p><p class="quiet">原型档案未受影响。</p>');button('重新加载',()=>location.reload(),true);break;
 }
}
async function resume(){
 if(pending||document.hidden||state.panel==='error')return;
 if(document.pointerLockElement===renderer.domElement){if(state.locked())drawPanel();return;}
 if(innerWidth<1024||innerHeight<640){notify('请使用至少 1024 × 640 的桌面窗口。');return;}
 pending=true;
 try{const request=renderer.domElement.requestPointerLock();await request;}catch(e){state.escape();drawPanel();notify(`未能锁定鼠标，请点击继续重试。${e instanceof Error?e.name:''}`);}finally{pending=false;}
}
function returnToScene(){if(!state.canReturn){state.escape();drawPanel();return;}void resume();}
function setLighting(){
 needsRender=true;renderer.shadowMap.needsUpdate=true;
 const disaster=lightMode==='disaster';scene.fog=new THREE.Fog(disaster?0x9b6d53:0x9babb7,35,125);renderer.toneMappingExposure=disaster?.72:.78;
 lights[0].intensity=disaster?3.5:3;lights[0].color.set(disaster?0xffb378:0xffdfab);lights[1].intensity=lightMode==='normal'?0:.65;suns[1].visible=lightMode!=='normal';
 $('light-label').textContent=(lightMode==='normal'?'常态':lightMode==='dual'?'双日':'灾变')+' · 检查光照';
}
function pick(){camera.updateMatrixWorld();ray.setFromCamera(new THREE.Vector2(),camera);ray.far=2.8;const hit=ray.intersectObjects(scene.children,true).find(h=>h.object instanceof THREE.Mesh&&h.object.visible&&!h.object.userData.sky);let node:THREE.Object3D|null=hit?.object??null;while(node&&!node.userData.targetId)node=node.parent;return world.targets.find(t=>t.id===node?.userData.targetId);}
async function initialize(){
 drawPanel();await RAPIER.init();physics=new RAPIER.World({x:0,y:-9.81,z:0});physics.timestep=1/60;
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(180,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,toneMapped:false,vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 direction; void main(){float h=pow(max(normalize(direction).y,0.),.45);vec3 c=mix(vec3(.83,.73,.64),vec3(.26,.43,.66),h);gl_FragColor=vec4(c,1.);}'}));sky.userData.sky=true;scene.add(sky);
 const ambient=new THREE.HemisphereLight(0xd5dfea,0xa29881,2.5);scene.add(ambient);
 const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.34;environment.dispose();pmrem.dispose();
 for(const [i,pos] of [[-30,32,-75],[2,42,-85]].entries()){const sun=new THREE.DirectionalLight(i?0xffc88e:0xffdfab,i?.65:3);sun.position.set(...pos as [number,number,number]);sun.target.position.set(0,0,-2);scene.add(sun,sun.target);sun.castShadow=i===0;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-23,right:23,top:24,bottom:-24,near:1,far:140});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;lights.push(sun);const disk=new THREE.Mesh(new THREE.SphereGeometry(i?1.1:2.2,32,16),new THREE.MeshBasicMaterial({color:i?0xffd393:0xffe9b7,fog:false,toneMapped:false}));disk.position.copy(sun.position).normalize().multiplyScalar(110);disk.userData.sky=true;suns.push(disk);scene.add(disk);}
 world=await createCourtyard(scene,physics);player=new PlayerController(physics,spawn);physics.step();viewPosition.reset(player.eye);camera.position.copy(player.eye);
 // This sample has fixed lights and a constant read-ledger pose, with no player mesh.
 // Rebuild only when lighting is selected; future moving shadow casters must invalidate it.
 renderer.shadowMap.autoUpdate=false;setLighting();
 const resize=()=>{needsRender=true;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(innerWidth<1024||innerHeight<640){state.interrupt('focusLost');pause();if(state.panel===null)state.escape();drawPanel();}};
 const opts={signal:abort.signal};window.addEventListener('resize',resize,opts);resize();
 document.addEventListener('pointerlockchange',()=>{keys.clear();viewPosition.reset(player.eye);if(document.pointerLockElement===renderer.domElement){if(!state.locked())document.exitPointerLock();}else state.interrupt('pointerUnlocked');drawPanel();},opts);
 document.addEventListener('pointerlockerror',()=>{pending=false;state.escape();drawPanel();notify('浏览器拒绝鼠标锁定，请点击继续重试。');},opts);
 window.addEventListener('blur',()=>{state.interrupt('focusLost');pause();drawPanel();},opts);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){state.interrupt('hidden');pause();drawPanel();}},opts);
 document.addEventListener('mousemove',e=>{if(state.clock.paused)return;camera.rotation.y-=e.movementX*.0018;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-e.movementY*.0018,-1.4,1.4);},opts);
 document.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Escape'){e.preventDefault();escape();return;}if(state.clock.paused)return;if(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyJ','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyJ')open('journal');if(e.code==='KeyE'&&target)open(target.id);},opts);
 document.addEventListener('keyup',e=>keys.delete(e.code),opts);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();state.clock.pause('contextLost');state.open('error');pause();drawPanel();$('failure').textContent='图形上下文丢失。请重新加载庭院。';},opts);
 state.ready();drawPanel();last=performance.now();
 renderer.setAnimationLoop(now=>{
  if(disposed)return;const delta=(now-last)/1000;last=now;
  if(document.hidden)return;
  state.clock.advance(delta,dt=>{
   movement.set(Number(keys.has('KeyD'))-Number(keys.has('KeyA')),0,Number(keys.has('KeyS'))-Number(keys.has('KeyW'))).normalize().applyAxisAngle(up,camera.rotation.y).multiplyScalar(keys.has('ShiftLeft')?4.5:3.1);
   player.move(movement.x,movement.z,dt);physics.step();viewPosition.record(player.eye);world.mixer.update(dt);
  });
  camera.position.copy(viewPosition.at(state.clock.interpolationAlpha));
  if(!state.clock.paused){
   const next=pick();if(next!==target){target=next;$('target').hidden=!target;$('target').querySelector('span')!.textContent=target?.name??'';}
  }
  if(!state.clock.paused||needsRender){renderer.render(scene,camera);needsRender=false;}
 });
 // Development-only inspection endpoint. It never fabricates pointer lock or bypasses physics.
 if(import.meta.env.DEV){Object.assign(window,{__courtyard:{scene,camera,player,world,physics,state,renderer,keys,readings,get snapshot(){const p=player.body.translation();return{position:[p.x,p.y,p.z],grounded:player.grounded,tick:state.clock.tick,panel:state.panel,reasons:[...state.clock.pauseReasons],locked:document.pointerLockElement===renderer.domElement,target:target?.id,records,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}}});}
}
$('journal').onclick=()=>open('journal');$('pause').onclick=escape;$('close').onclick=()=>state.panel==='settings'?(state.panel=state.settingsOrigin,drawPanel()):state.panel==='pause'?void resume():returnToScene();panel.addEventListener('cancel',e=>{e.preventDefault();escape();});
window.addEventListener('pagehide',()=>{disposed=true;abort.abort();clearTimeout(notifyTimer);renderer?.setAnimationLoop(null);player?.dispose();physics?.free();disposeResources([scene]);renderer?.dispose();});
void initialize().catch(e=>{state.open('error');drawPanel();$('failure').textContent=e instanceof Error?e.message:String(e);});





