import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {PlayerController} from '../src/player/controller';
import {GameClock} from '../src/game/clock';
import {prepareModelMaterials} from '../src/renderer/model-materials';
import {disposeResources} from '../src/renderer/dispose-resources';
import manifest from '../content/assets/manifest.json';
const host=document.querySelector<HTMLDivElement>('#scene')!,status=document.querySelector<HTMLParagraphElement>('#status')!,diagnostics=document.querySelector<HTMLPreElement>('#diagnostics')!,reading=document.querySelector<HTMLParagraphElement>('#reading')!,start=document.querySelector<HTMLButtonElement>('#start')!,retry=document.querySelector<HTMLButtonElement>('#retry')!;
let cleanup=()=>{};
async function initialize(){
 cleanup();start.disabled=true;retry.hidden=true;status.textContent='正在初始化 Rapier 与原生模型…';
 const scene=new THREE.Scene(),abort=new AbortController(),keys=new Set<string>(),clock=new GameClock();let renderer:THREE.WebGLRenderer|undefined,world:RAPIER.World|undefined,player:PlayerController|undefined,observer:ResizeObserver|undefined;
 let disposed=false;
 cleanup=()=>{if(disposed)return;disposed=true;abort.abort();observer?.disconnect();renderer?.setAnimationLoop(null);if(document.pointerLockElement===renderer?.domElement)document.exitPointerLock();player?.dispose();world?.free();disposeResources([scene]);renderer?.dispose();renderer?.forceContextLoss();host.replaceChildren();};
 try{
 await RAPIER.init();world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.info.autoReset=false;host.append(renderer.domElement);scene.background=new THREE.Color(0x789499);
 const camera=new THREE.PerspectiveCamera(65,1,.1,150);camera.rotation.order='YXZ';
 const material=new THREE.MeshStandardMaterial({color:0xafa38c,roughness:1});
 function box(x:number,y:number,z:number,w:number,h:number,d:number){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);world!.createCollider(RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(x,y,z));}
 box(0,-.5,0,40,1,40);box(-3,1,-2,2,2,2);box(3,.5,0,2,1,2);
 const sizes:string[]=[];let pillar:THREE.Object3D|undefined;
 for(const [id,x,z] of [['stairs',5,-6],['observatory_pillar',0,-4],['npc',-2,-6]] as const){const entry=manifest.find(item=>item.id===id)!;const gltf=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}${entry.path}?v=${entry.sha256}`);scene.add(gltf.scene);prepareModelMaterials(gltf.scene);const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());sizes.push(`${id}: ${size.toArray().map(v=>v.toFixed(2)).join(' × ')} m`);gltf.scene.position.set(x,0,z);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(node=>{if(node instanceof THREE.Mesh){node.castShadow=node.receiveShadow=true;const bounds=new THREE.Box3().setFromObject(node),extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());world!.createCollider(RAPIER.ColliderDesc.cuboid(extent.x/2,extent.y/2,extent.z/2).setTranslation(center.x,center.y,center.z));}});if(id==='observatory_pillar')pillar=gltf.scene;}
 const sunDirection=new THREE.Vector3(-.4,.8,-.3).normalize(),sun=new THREE.DirectionalLight(0xffecc8,3);sun.position.copy(sunDirection).multiplyScalar(20);sun.castShadow=true;sun.shadow.camera.left=sun.shadow.camera.bottom=-20;sun.shadow.camera.right=sun.shadow.camera.top=20;scene.add(sun,new THREE.HemisphereLight(0xcadce3,0x6b614c,2));const disc=new THREE.Mesh(new THREE.SphereGeometry(.8,16,12),new THREE.MeshBasicMaterial({color:0xffecc8}));disc.position.copy(sunDirection).multiplyScalar(45);scene.add(disc);
 player=new PlayerController(world,{x:0,y:.9,z:4});world.step();clock.clear('loading');
 observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer!.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(host);
 const options={signal:abort.signal};const pause=()=>{keys.clear();clock.pause('pointerUnlocked');status.textContent='已暂停；点击进入验证继续。';};
 start.onclick=async()=>{try{await renderer!.domElement.requestPointerLock();}catch{pause();status.textContent='浏览器拒绝鼠标锁定。请在允许 Pointer Lock 的桌面浏览器打开此页。';}};
 document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement===renderer!.domElement){clock.clear('pointerUnlocked');clock.clear('focusLost');clock.clear('hidden');status.textContent='验证进行中';}else pause();},options);
 window.addEventListener('blur',()=>{clock.pause('focusLost');pause();},options);document.addEventListener('visibilitychange',()=>{if(document.hidden){clock.pause('hidden');pause();}},options);
 document.addEventListener('mousemove',e=>{if(clock.paused)return;camera.rotation.y-=e.movementX*.002;camera.rotation.x=THREE.MathUtils.clamp(camera.rotation.x-e.movementY*.002,-1.5,1.5);},options);
 document.addEventListener('keydown',e=>{if(clock.paused)return;keys.add(e.code);if(['KeyW','KeyA','KeyS','KeyD','KeyE'].includes(e.code))e.preventDefault();if(e.code==='KeyE'&&!e.repeat){camera.updateMatrixWorld();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(),camera);ray.far=2.5;const hit=ray.intersectObjects(scene.children,true).find(h=>h.object instanceof THREE.Mesh);let node:THREE.Object3D|null=hit?.object??null;while(node&&node!==pillar)node=node.parent;reading.textContent=node===pillar?`测试太阳高度角 ${(Math.asin(sunDirection.y)*180/Math.PI).toFixed(1)}°。这是固定技术样本，不计入游戏证据。`:'请走到观象柱 2.5 米内并面向柱体。';}},options);
 document.addEventListener('keyup',e=>keys.delete(e.code),options);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();clock.pause('contextLost');keys.clear();start.disabled=true;retry.hidden=false;status.textContent='图形上下文丢失，请重新初始化。';},options);
 let last=performance.now(),lastPanel=0;renderer.setAnimationLoop(now=>{const delta=(now-last)/1000;last=now;clock.advance(delta,dt=>{const x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyS'))-Number(keys.has('KeyW')),v=new THREE.Vector3(x,0,z).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),camera.rotation.y).multiplyScalar(3.6);player!.move(v.x,v.z,dt);world!.step();});camera.position.copy(player!.eye);renderer!.info.reset();renderer!.render(scene,camera);if(now-lastPanel>200){lastPanel=now;const p=player!.body.translation();diagnostics.textContent=`坐标 ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}\n贴地 ${player!.grounded}\n鼠标锁定 ${document.pointerLockElement===renderer!.domElement}\n暂停原因 ${[...clock.pauseReasons].join(', ')||'无'}\nDraw calls ${renderer!.info.render.calls}\n帧间隔 ${(delta*1000).toFixed(1)} ms\n固定步 ${clock.tick}\n\n模型尺寸\n${sizes.join('\n')}`;}});start.disabled=false;status.textContent='初始化完成，点击进入验证。';
 }catch(error){cleanup();start.disabled=true;retry.hidden=false;status.textContent=`初始化失败，未启用移动：${error instanceof Error?error.message:String(error)}`;}
}
retry.onclick=()=>void initialize();window.addEventListener('pagehide',()=>cleanup());void initialize();
