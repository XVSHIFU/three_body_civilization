import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareModelMaterials} from '../src/renderer/model-materials';
import {disposeResources} from '../src/renderer/dispose-resources';
import manifest from '../content/assets/manifest.json';
const host=document.querySelector<HTMLElement>('#scene')!,status=document.querySelector<HTMLElement>('#status')!,model=document.querySelector<HTMLSelectElement>('#model')!,distance=document.querySelector<HTMLSelectElement>('#distance')!,angle=document.querySelector<HTMLSelectElement>('#angle')!,temperature=document.querySelector<HTMLInputElement>('#temperature')!,reload=document.querySelector<HTMLButtonElement>('#reload')!;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.1,150);let renderer:THREE.WebGLRenderer|undefined,root:THREE.Group|undefined,pointer:THREE.Object3D|undefined,pointerBase=0,request=0,closed=false;
scene.background=new THREE.Color(0x789499);scene.add(new THREE.HemisphereLight(0xb8d3df,0x756448,2));const light=new THREE.DirectionalLight(0xffedce,3);light.position.set(-3,7,5);scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0x887f6c,roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
function render(){if(!renderer||!root)return;const d=Number(distance.value),a=Number(angle.value);camera.position.set(Math.sin(a)*d,1.645,Math.cos(a)*d);camera.lookAt(0,1,0);const value=temperature.valueAsNumber;if(pointer&&Number.isFinite(value))pointer.position.y=pointerBase+(Math.max(-20,Math.min(80,value))+20)/100*1.2-.6;renderer.render(scene,camera);}
async function load(){const token=++request;reload.disabled=true;status.textContent='加载生产 GLB…';
 try{if(!renderer){renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;host.append(renderer.domElement);resize();}
 const entry=manifest.find(e=>e.id===model.value)!;const loaded=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}${entry.path}?v=${entry.sha256}`);if(token!==request||closed){disposeResources([loaded.scene]);return;}
 if(root){scene.remove(root);disposeResources([root]);}root=loaded.scene;prepareModelMaterials(root);scene.add(root);pointer=root.getObjectByName('pointer');pointerBase=pointer?.position.y??0;temperature.disabled=!pointer;
 const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());render();status.textContent=`${entry.id} · ${size.toArray().map(v=>v.toFixed(2)).join(' × ')} 米 · ${entry.triangles} 三角形 · ${entry.bytes} 字节 · 已加载`;
 }catch(error){if(token===request)status.textContent=`加载失败：${String(error)}。可点击重新加载。`;}finally{if(token===request)reload.disabled=false;}}
function resize(){if(!renderer)return;renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();}
const observer=new ResizeObserver(resize);observer.observe(host);model.onchange=()=>void load();reload.onclick=()=>void load();distance.onchange=angle.onchange=temperature.oninput=render;
function dispose(){if(closed)return;closed=true;request++;observer.disconnect();disposeResources([scene]);renderer?.dispose();renderer?.forceContextLoss();}
window.addEventListener('pagehide',dispose);if(import.meta.hot)import.meta.hot.dispose(dispose);void load();
