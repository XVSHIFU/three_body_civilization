import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {prepareModelMaterials} from '../src/renderer/model-materials';
import {disposeResources} from '../src/renderer/dispose-resources';
import v0 from '../reports/blockbench/npc_variant_0-native.glb?url';
import v1 from '../reports/blockbench/npc_variant_1-native.glb?url';
import v2 from '../reports/blockbench/npc_variant_2-native.glb?url';
import v3 from '../reports/blockbench/npc_variant_3-native.glb?url';
import v4 from '../reports/blockbench/npc_variant_4-native.glb?url';
import v5 from '../reports/blockbench/npc_variant_5-native.glb?url';
const host=document.querySelector<HTMLElement>('#scene')!,status=document.querySelector<HTMLElement>('#status')!,clip=document.querySelector<HTMLSelectElement>('#clip')!,angle=document.querySelector<HTMLSelectElement>('#angle')!,reload=document.querySelector<HTMLButtonElement>('#reload')!;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,100);camera.position.set(0,3,12);camera.lookAt(0,1,0);
scene.background=new THREE.Color(0x202b35);scene.add(new THREE.HemisphereLight(0xb8d3df,0x756448,2));const light=new THREE.DirectionalLight(0xffedce,3);light.position.set(-3,5,5);scene.add(light);
const floor=new THREE.Mesh(new THREE.BoxGeometry(9,.08,2),new THREE.MeshStandardMaterial({color:0x4f6267,roughness:1}));floor.position.y=-.04;scene.add(floor);
let renderer:THREE.WebGLRenderer|undefined,actors:{asset:GLTF;mixer:THREE.AnimationMixer;placement:THREE.Group}[]=[],token=0,closed=false;
function render(){if(!renderer)return;for(const actor of actors){actor.mixer.stopAllAction();const action=actor.asset.animations.find(c=>c.name===clip.value);if(action){actor.mixer.clipAction(action).play();actor.mixer.setTime(action.duration*.37);}actor.placement.rotation.y=Number(angle.value);}renderer.render(scene,camera);}
function resize(){if(!renderer)return;renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();}
function clearActors(){for(const actor of actors){actor.mixer.stopAllAction();actor.mixer.uncacheRoot(actor.asset.scene);scene.remove(actor.placement);}disposeResources(actors.map(a=>a.placement));actors=[];}
async function load(){const current=++token;reload.disabled=true;status.textContent='加载六份原生导出…';const loaded:GLTF[]=[];try{
 if(!renderer){renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);resize();}
 for(const url of [v0,v1,v2,v3,v4,v5]){loaded.push(await new GLTFLoader().loadAsync(url));if(closed||current!==token){disposeResources(loaded.map(a=>a.scene));return;}}
 clearActors();actors=loaded.map((asset,index)=>{prepareModelMaterials(asset.scene);const placement=new THREE.Group();placement.position.x=(index-2.5)*1.3;placement.add(asset.scene);scene.add(placement);return {asset,placement,mixer:new THREE.AnimationMixer(asset.scene)};});render();status.textContent='六份原生 GLB 已加载 · 每份包含 idle / walk / observe / panic / preserve';
 }catch(error){disposeResources(loaded.map(a=>a.scene));if(current===token)status.textContent=`加载失败：${String(error)}。可重新加载。`;}finally{if(current===token)reload.disabled=false;}}
const observer=new ResizeObserver(resize);observer.observe(host);clip.onchange=angle.onchange=render;reload.onclick=()=>void load();
function dispose(){if(closed)return;closed=true;token++;observer.disconnect();clearActors();disposeResources([scene]);renderer?.dispose();renderer?.forceContextLoss();}
window.addEventListener('pagehide',dispose);if(import.meta.hot)import.meta.hot.dispose(dispose);void load();
