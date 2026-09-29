import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareModelMaterials} from '../src/renderer/model-materials';
import {disposeResources} from '../src/renderer/dispose-resources';
import terrace from '../reports/blockbench/house_terrace-native.glb?url';
import tower from '../reports/blockbench/house_tower-native.glb?url';
import terraceRuined from '../reports/blockbench/house_terrace_ruined-native.glb?url';
import towerRuined from '../reports/blockbench/house_tower_ruined-native.glb?url';
import ground_slab from '../reports/blockbench/ground_slab-native.glb?url';
import ground_band from '../reports/blockbench/ground_band-native.glb?url';
import ground_platform from '../reports/blockbench/ground_platform-native.glb?url';
import wall_corner from '../reports/blockbench/wall_corner-native.glb?url';
import railing from '../reports/blockbench/railing-native.glb?url';
import stone_cluster from '../reports/blockbench/stone_cluster-native.glb?url';
import supply_crate from '../reports/blockbench/supply_crate-native.glb?url';
import route_flag from '../reports/blockbench/route_flag-native.glb?url';
import observatory_assembly from '../reports/blockbench/observatory_assembly-native.glb?url';
const models:Record<string,string>={house_terrace:terrace,house_tower:tower,house_terrace_ruined:terraceRuined,house_tower_ruined:towerRuined,ground_slab,ground_band,ground_platform,wall_corner,railing,stone_cluster,supply_crate,route_flag,observatory_assembly};
const host=document.querySelector<HTMLElement>('#scene')!,status=document.querySelector<HTMLElement>('#status')!,model=document.querySelector<HTMLSelectElement>('#model')!,distance=document.querySelector<HTMLSelectElement>('#distance')!,angle=document.querySelector<HTMLSelectElement>('#angle')!,height=document.querySelector<HTMLSelectElement>('#height')!,reload=document.querySelector<HTMLButtonElement>('#reload')!;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.1,150);let renderer:THREE.WebGLRenderer|undefined,root:THREE.Group|undefined,request=0,closed=false,focusHeight=3;
scene.background=new THREE.Color(0x789499);scene.add(new THREE.HemisphereLight(0xb8d3df,0x756448,2));const light=new THREE.DirectionalLight(0xffedce,3);light.position.set(-3,7,5);scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0x887f6c,roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
function render(){if(!renderer||!root)return;const d=Number(distance.value),a=Number(angle.value);camera.position.set(Math.sin(a)*d,Number(height.value),Math.cos(a)*d);camera.lookAt(0,focusHeight,0);renderer.render(scene,camera);}
function resize(){if(!renderer)return;renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();}
async function load(){const token=++request;reload.disabled=true;status.textContent='加载原生导出 GLB…';try{
 if(!renderer){renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);resize();}
 const id=model.value,loaded=await new GLTFLoader().loadAsync(models[id]);if(token!==request||closed){disposeResources([loaded.scene]);return;}
 if(root){scene.remove(root);disposeResources([root]);}root=loaded.scene;prepareModelMaterials(root);scene.add(root);
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());if(id==='observatory_assembly'){const center=bounds.getCenter(new THREE.Vector3());root.position.x-=center.x;root.position.z-=center.z;}focusHeight=id==='observatory_assembly'?size.y/2:Math.min(3,size.y/2);render();status.textContent=`${id} · ${size.toArray().map(v=>v.toFixed(2)).join(' × ')} 米 · 已加载 · 独立模型检视`;
 }catch(error){if(token===request)status.textContent=`加载失败：${String(error)}。可点击重新加载。`;}finally{if(token===request)reload.disabled=false;}}
const observer=new ResizeObserver(resize);observer.observe(host);model.onchange=()=>void load();reload.onclick=()=>void load();distance.onchange=angle.onchange=height.onchange=render;
function dispose(){if(closed)return;closed=true;request++;observer.disconnect();disposeResources([scene]);renderer?.dispose();renderer?.forceContextLoss();}
window.addEventListener('pagehide',dispose);if(import.meta.hot)import.meta.hot.dispose(dispose);void load();
