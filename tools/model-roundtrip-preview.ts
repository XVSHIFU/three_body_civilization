import {createNpcAppearance} from '../src/renderer/npc-appearance';
import {prepareModelMaterials} from '../src/renderer/model-materials';
import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
const ids=['ruler_cube','wall','doorway','stairs','observatory_pillar','npc','facility'];
const host=document.querySelector<HTMLElement>('#scene')!,status=document.querySelector('#status')!,select=document.querySelector<HTMLSelectElement>('#model')!,filter=document.querySelector<HTMLSelectElement>('#filter')!,download=document.querySelector<HTMLButtonElement>('#report')!;
const appearance=document.querySelector<HTMLSelectElement>('#appearance')!,animation=document.querySelector<HTMLSelectElement>('#animation')!;
const appearances=new Map<string,THREE.Object3D>();let mixers:THREE.AnimationMixer[]=[];
const models=new Map<string,[GLTF,GLTF]>(),reports:unknown[]=[];
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x18262b);renderer.toneMapping=THREE.ACESFilmicToneMapping;host.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,200),stage=new THREE.Group();scene.add(stage);
scene.add(new THREE.HemisphereLight(0xb8d3df,0x756448,2));const light=new THREE.DirectionalLight(0xffedce,3);light.position.set(-3,5,5);scene.add(light);
const render=()=>renderer.render(scene,camera);
function resize(){renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();}
new ResizeObserver(resize).observe(host);
function show(){
 const pair=models.get(select.value);if(!pair)return;mixers.forEach(m=>{m.stopAllAction();m.uncacheRoot(m.getRoot());});mixers=[];stage.clear();stage.rotation.y=0;
 const size=new THREE.Box3().setFromObject(pair[0].scene).getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,1),distance=Math.max(span*3.3,size.y*2.3,4);
 pair.forEach((gltf,index)=>{let root:THREE.Object3D=gltf.scene;if(select.value==='npc'&&Number(appearance.value)>=0){const key=`${index}:${appearance.value}`;if(!appearances.has(key))appearances.set(key,createNpcAppearance(gltf.scene,Number(appearance.value)));root=appearances.get(key)!;}
 if(select.value==='npc'&&animation.value){const clip=gltf.animations.find(c=>c.name===animation.value);if(clip){const mixer=new THREE.AnimationMixer(root);mixer.clipAction(clip).play();mixers.push(mixer);}}
 root.position.set((index-.5)*span*1.6,0,0);stage.add(root);root.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material]){if(material.map){material.map.magFilter=THREE.NearestFilter;material.map.minFilter=filter.value==='nearest'?THREE.NearestMipmapLinearFilter:THREE.LinearMipmapLinearFilter;material.map.needsUpdate=true;}}});});
 camera.position.set(0,size.y*.6+distance*.18,distance);camera.lookAt(0,size.y*.5,0);render();
 status.textContent=`已加载 ${models.size}/7 对模型 · ${select.value} · 米制尺寸 ${size.toArray().map(v=>v.toFixed(3)).join(' × ')}`;
}
select.addEventListener('change',show);filter.addEventListener('change',show);appearance.addEventListener('change',show);animation.addEventListener('change',show);
let previousFrame=0;renderer.setAnimationLoop(now=>{const delta=previousFrame?Math.min((now-previousFrame)/1000,.1):0;previousFrame=now;if(mixers.length){mixers.forEach(m=>m.update(delta));render();}});
let dragging=false,lastX=0;renderer.domElement.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;renderer.domElement.setPointerCapture(event.pointerId);});renderer.domElement.addEventListener('pointerup',()=>dragging=false);renderer.domElement.addEventListener('pointercancel',()=>dragging=false);renderer.domElement.addEventListener('pointermove',event=>{if(dragging){stage.rotation.y+=(event.clientX-lastX)*.008;lastX=event.clientX;render();}});
download.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({scope:'Actual browser GLTFLoader loads; dimensions and decoded texture metadata. Not gameplay or GPU performance acceptance.',assets:reports,preview:{model:select.value,appearance:appearance.value,animation:animation.value,filter:filter.value},poses:mixers.map(m=>{const bones:Record<string,number[]>={},root=m.getRoot();if(!(root instanceof THREE.Object3D))return bones;root.traverse(o=>{if(o.children.length&&/^(arm_[lr]|leg_[lr])(?:_\d+)?$/.test(o.name))bones[o.name.replace(/_\d+$/,'')]=o.quaternion.toArray();});return bones;})},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='native-model-browser-report.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
try{
 const loader=new GLTFLoader();
 for(const id of ids){
  const runtime=await loader.loadAsync(`/reports/vertex-assets/${id}.glb`),native=await loader.loadAsync(`/reports/blockbench/${id}-native-palette.glb`);
  const runtimeSize=new THREE.Box3().setFromObject(runtime.scene).getSize(new THREE.Vector3()),nativeSize=new THREE.Box3().setFromObject(native.scene).getSize(new THREE.Vector3());
  const textures=new Set<THREE.Texture>();native.scene.traverse(object=>{if(object instanceof THREE.Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material])if(material.map)textures.add(material.map);});
  const textureMetadata=[...textures].map(texture=>{
   const importedGenerateMipmaps=texture.generateMipmaps;
   texture.generateMipmaps=true;
   texture.magFilter=THREE.NearestFilter;
   texture.minFilter=THREE.LinearMipmapLinearFilter;
   texture.needsUpdate=true;
   return {width:(texture.image as ImageBitmap).width,height:(texture.image as ImageBitmap).height,colorSpace:texture.colorSpace,importedGenerateMipmaps,previewGenerateMipmaps:texture.generateMipmaps};
  });
  prepareModelMaterials(native.scene);
  reports.push({id,runtimeSize:runtimeSize.toArray(),nativeSize:nativeSize.toArray(),maxSizeError:Math.max(...runtimeSize.toArray().map((value,i)=>Math.abs(value-nativeSize.toArray()[i]))),animations:native.animations.map(clip=>clip.name),textures:textureMetadata});
  models.set(id,[runtime,native]);const option=document.createElement('option');option.value=id;option.textContent=id;select.append(option);
 }
 resize();show();download.disabled=false;
}catch(error){status.textContent=`加载失败：${String(error)}`;}
