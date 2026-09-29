import {interactionTarget} from '../src/renderer/interaction-ray';
import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import * as THREE from 'three';
import {embeddedModelLoader} from './embedded-model-loader';
import RAPIER from '@dimforge/rapier3d-compat';
import {createWorld} from '../src/renderer/world';
import {PlayerController} from '../src/player/controller';
import type {AssetLibrary} from '../src/renderer/assets';
import {assetIds} from '../src/renderer/assets';
import {assetPoint} from '../src/renderer/asset-points';
import {createNpcAppearance,npcAppearances} from '../src/renderer/npc-appearance';
it('decodes every embedded production palette pixel in Node without claiming browser or GPU decoding',async()=>{
 for(const id of assetIds){
  const bytes=readFileSync(`public/assets/models/${id}.glb`),gltf=await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const textures=new Set<THREE.DataTexture>();gltf.scene.traverse(object=>{if(object instanceof THREE.Mesh){const material=object.material as THREE.MeshStandardMaterial;if(material.map)textures.add(material.map as THREE.DataTexture);}});
  expect(textures.size).toBe(1);
  for(const texture of textures){
   const {data,width,height}=texture.image;if(!data)throw Error('Decoded palette pixels missing');expect(width).toBe(id==='npc'?64:512);expect(height).toBe(width);let matches=true;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const color=[0xafa38c,0x4f6267,0xbc9658][Math.min(2,Math.floor(x/width*3))],at=(y*width+x)*4;
    if(data[at]!==color>>>16||data[at+1]!==((color>>>8)&255)||data[at+2]!==(color&255)||data[at+3]!==255)matches=false;
   }
   expect(matches,`palette pixels ${id}`).toBe(true);
  }
 }
});
it('distinguishes six NPCs without mutating the shared model or sharing fade state',async()=>{
 const bytes=readFileSync('public/assets/models/npc.glb');
 const asset=await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const before=asset.scene.toJSON(),actors=npcAppearances.map((_,index)=>createNpcAppearance(asset.scene,index));
 expect(new Set(actors.map(actor=>actor.userData.appearance)).size).toBe(6);
 const materialSets=actors.map(actor=>{
  const materials=new Set<THREE.Material>();let triangles=0;
  actor.traverse(object=>{if(object instanceof THREE.Mesh){(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));triangles+=(object.geometry.index?.count??object.geometry.getAttribute('position').count)/3;}});
  expect(triangles).toBeLessThanOrEqual(1200);expect(materials.size).toBe(1);return materials;
 });
 expect([...materialSets[0]].some(m=>materialSets[1].has(m))).toBe(false);
 expect(actors[0].getObjectByName('hat_crown')).toBeTruthy();
 expect(actors[1].getObjectByName('backpack')).toBeTruthy();
 for(const actor of actors){const mixer=new THREE.AnimationMixer(actor);mixer.clipAction(asset.animations.find(clip=>clip.name==='walk')!).play();mixer.update(.2);expect(actor.getObjectByName('arm_l')!.quaternion.x).not.toBe(0);mixer.stopAllAction();}
 expect(asset.scene.toJSON()).toEqual(before);
});
it('transforms asset interaction points with parent placement, scale and rotation',()=>{
 const scene=new THREE.Scene(),parent=new THREE.Group(),root=new THREE.Group();
 scene.add(parent);parent.position.set(10,2,3);parent.rotation.y=Math.PI/2;
 parent.add(root);root.position.set(2,0,0);root.scale.set(2,3,4);
 const console=assetPoint('facility','console',root);
 expect(console.x).toBeCloseTo(22);expect(console.y).toBeCloseTo(5);expect(console.z).toBeCloseTo(4);
 expect(()=>assetPoint('facility','missing',root)).toThrow('模型交互点缺失');
});
it('keeps editable source animations attached to existing bone UUIDs',()=>{
 const source=JSON.parse(readFileSync('assets/source/npc.bbmodel','utf8'));
 const bones=new Set(source.outliner.map((g:{uuid:string})=>g.uuid));
 expect(source.animations.map((a:{name:string})=>a.name)).toEqual(['idle','walk','observe','panic','preserve']);
 for(const animation of source.animations){
  expect(Object.keys(animation.animators)).toHaveLength(4);
  for(const [id,animator] of Object.entries(animation.animators) as [string,{keyframes:{time:number;data_points:{x:string}[]}[]}][]){
   expect(bones.has(id)).toBe(true);expect(animator.keyframes).toHaveLength(3);
   expect(animator.keyframes.every(k=>k.time<=animation.length&&Number.isFinite(Number(k.data_points[0].x)))).toBe(true);
  }
 }
});
it('uses imported pillar and facility geometry with a passable physical doorway',async()=>{
 await RAPIER.init();const assets:AssetLibrary=new Map(),loader=embeddedModelLoader();
 for(const id of ['observatory_pillar','facility','wall','doorway','stairs']){const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
 const scene=new THREE.Scene(),world=new RAPIER.World({x:0,y:-9.81,z:0}),built=createWorld(scene,world,assets);
 expect(built.removedTriangles).toBeGreaterThan(0);
 expect(built.interactables.find(t=>t.stableId==='pillar')!.object.getObjectByName('observatory_pillar')).toBeTruthy();
 expect(scene.getObjectByName('facility')).toBeTruthy();
 const pillar=built.interactables.find(t=>t.stableId==='pillar')!;
 const origin=pillar.observationOrigin!();
 expect(origin.toArray()).toEqual([-10,3.15,-8]);
 expect(new THREE.Raycaster(origin,new THREE.Vector3(0,1,0),.01,10).intersectObject(pillar.object,true)).toHaveLength(0);
 expect(built.interactables.find(t=>t.stableId==='facility')!.object.position.toArray()).toEqual([-25.5,1,-27]);
 const player=new PlayerController(world,{x:-24,y:.9,z:-23});world.step();
 for(let i=0;i<60;i++){player.move(0,-4.2,1/60);world.step();}
 expect(player.body.translation().z).toBeLessThan(-26.5);expect(player.grounded).toBe(true);
 player.setPosition(24,.9,-6);
 for(let i=0;i<600&&player.body.translation().z>-33;i++){player.move(0,-4.2,1/60);world.step();}
 expect(player.body.translation().z).toBeLessThan(-32);expect(player.eye.y).toBeGreaterThan(13.5);
 player.dispose();world.free();
});
it('loads actual GLB units and animation curves, not only named empty clips',async()=>{const loader=embeddedModelLoader();for(const [id,size] of [['ruler_cube',1],['npc',1.75]] as const){const bytes=readFileSync(`public/assets/models/${id}.glb`);const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const bounds=new THREE.Box3().setFromObject(gltf.scene);expect(bounds.getSize(new THREE.Vector3()).y).toBeCloseTo(size,5);if(id==='npc'){expect(gltf.animations).toHaveLength(5);expect(gltf.animations.every(a=>a.tracks.length>=4)).toBe(true);const arm=gltf.scene.getObjectByName('arm_l')!;const before=arm.quaternion.clone(),mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(a=>a.name==='walk')!).play();mixer.update(.2);expect(arm.quaternion.equals(before)).toBe(false);mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);}}});
it('loads both new instruments into the world, keeps their approach usable and moves only the temperature pointer',async()=>{
 await RAPIER.init();const assets:AssetLibrary=new Map();
 for(const id of ['thermometer','archive_desk']){const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
 const scene=new THREE.Scene(),physics=new RAPIER.World({x:0,y:-9.81,z:0}),built=createWorld(scene,physics,assets);
 for(const id of ['thermometer','archive'] as const){
  const target=built.interactables.find(t=>t.stableId===id)!;expect(target.object).toBeInstanceOf(THREE.Group);
  const point=assetPoint(id==='archive'?'archive_desk':id,'operate',target.object),origin=point.clone().add(new THREE.Vector3(0,.1,1.5));
  target.object.updateMatrixWorld(true);const ray=new THREE.Raycaster(origin,point.clone().sub(origin).normalize(),0,2.5);
  expect(ray.intersectObject(target.object,true).length).toBeGreaterThan(0);
  expect(interactionTarget(ray,built.solid,built.interactables,{ended:false,preservationPhase:'idle',dispatch:()=>{}})).toBe(target);
  const player=new PlayerController(physics,{x:origin.x,y:.9,z:origin.z});physics.step();for(let i=0;i<60;i++){player.move(0,0,1/60);physics.step();}expect(player.grounded).toBe(true);expect(player.body.translation().z).toBeCloseTo(origin.z,3);player.dispose();
 }
 const pointer=scene.getObjectByName('thermometer')!.getObjectByName('pointer')!;
 built.setTemperature(-20);const low=pointer.position.y;built.setTemperature(80);expect(pointer.position.y-low).toBeCloseTo(1.2);built.setTemperature(200);expect(pointer.position.y-low).toBeCloseTo(1.2);
 physics.free();
});
