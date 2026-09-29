import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createNpcAppearance,npcAppearances} from '../src/renderer/npc-appearance';
const host=document.querySelector<HTMLElement>('#scene')!,status=document.querySelector('#status')!;
try{
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setClearColor(0x18262b);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,100);
 camera.position.set(0,3,11);camera.lookAt(0,1,0);
 scene.add(new THREE.HemisphereLight(0xb8d3df,0x756448,2));
 const light=new THREE.DirectionalLight(0xffedce,3);light.position.set(-3,5,5);scene.add(light);
 const asset=await new GLTFLoader().loadAsync('/assets/models/npc.glb');
 const actors=npcAppearances.map((appearance,index)=>{
  const actor=createNpcAppearance(asset.scene,index);actor.position.x=(index-2.5)*1.25;actor.rotation.y=.25;scene.add(actor);
  const label=document.createElement('span');label.textContent=appearance.name;document.querySelector('#labels')!.append(label);return actor;
 });
 const floor=new THREE.Mesh(new THREE.BoxGeometry(9,.08,2),new THREE.MeshStandardMaterial({color:0x4f6267,roughness:1}));floor.position.y=-.04;scene.add(floor);
 const render=()=>renderer.render(scene,camera);
 const resize=()=>{renderer.setSize(host.clientWidth,host.clientHeight);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();};
 new ResizeObserver(resize).observe(host);resize();
 let rear=false;document.querySelector('#turn')!.addEventListener('click',event=>{rear=!rear;actors.forEach(actor=>actor.rotation.y=(rear?Math.PI:0)+.25);(event.target as HTMLElement).textContent=rear?'查看正面':'查看背面';render();});
 status.textContent=' 六名角色已加载';
}catch(error){status.textContent=` 加载失败：${String(error)}`;}
