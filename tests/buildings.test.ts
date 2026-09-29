import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {embeddedModelLoader} from './embedded-model-loader';
import type {AssetLibrary} from '../src/renderer/assets';
import {buildingPlots,createBuildings} from '../src/renderer/buildings';
it('keeps all six native building pairs inside original plots and switches physical height with destruction',async()=>{
 await RAPIER.init();const assets:AssetLibrary=new Map();
 for(const id of ['house_terrace','house_tower','house_terrace_ruined','house_tower_ruined']){const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
 const scene=new THREE.Scene(),physics=new RAPIER.World({x:0,y:0,z:0}),solids:THREE.Mesh[]=[],buildings=createBuildings(scene,physics,assets,solids);
 expect(Object.values(buildings.removedTriangles).every(count=>count>0)).toBe(true);
 expect(buildings.states).toHaveLength(6);expect(solids).toHaveLength(12);
 expect(buildings.states[0].intact.geometry).toBe(buildings.states[2].intact.geometry);
 expect(new Set(buildings.states.map(s=>s.intact.rotation.y)).size).toBe(2);
 for(const [index,state] of buildings.states.entries()){
  const [x,z,w,d,h]=buildingPlots[index];
  for(const mesh of [state.intact,state.ruined]){const bounds=new THREE.Box3().setFromObject(mesh);expect(bounds.min.x).toBeCloseTo(x-(w+1)/2,5);expect(bounds.max.x).toBeCloseTo(x+(w+1)/2,5);expect(bounds.min.z).toBeCloseTo(z-(d+1)/2,5);expect(bounds.max.z).toBeCloseTo(z+(d+1)/2,5);expect(bounds.min.y).toBeCloseTo(0,5);}
  expect(new THREE.Box3().setFromObject(state.intact).max.y).toBeCloseTo(h+1.2,5);
  expect(state.intactColliders.every(c=>c.isEnabled())).toBe(true);expect(state.ruinedColliders.every(c=>!c.isEnabled())).toBe(true);
 }
 const highRay=new RAPIER.Ray({x:-38,y:5,z:50},{x:0,y:0,z:-1}),lowRay=new RAPIER.Ray({x:-38,y:1,z:50},{x:0,y:0,z:-1});
 physics.step();expect(physics.castRay(highRay,30,true)).not.toBeNull();
 for(let cycle=0;cycle<2;cycle++){
  buildings.setDestroyed(true);physics.step();expect(physics.castRay(highRay,30,true)).toBeNull();expect(physics.castRay(lowRay,30,true)).not.toBeNull();
  for(const state of buildings.states){expect(state.intact.visible).toBe(false);expect(state.ruined.visible).toBe(true);expect(state.intactColliders.every(c=>!c.isEnabled())).toBe(true);expect(state.ruinedColliders.every(c=>c.isEnabled())).toBe(true);}
  buildings.setDestroyed(false);physics.step();expect(physics.castRay(highRay,30,true)).not.toBeNull();expect(buildings.states.every(s=>s.intact.visible&&!s.ruined.visible)).toBe(true);
 }
 // Compare the rendered tops with Rapier after collapse, including rotated plots.
 // A flattened legacy collider would miss the surviving walls or fill their gaps.
 buildings.setDestroyed(true);physics.step();
 for(const state of buildings.states){
  const bounds=new THREE.Box3().setFromObject(state.ruined),size=bounds.getSize(new THREE.Vector3());
  for(let u=0;u<16;u++)for(let v=0;v<16;v++){
   const origin=new THREE.Vector3(bounds.min.x+(u+.41)/16*size.x,bounds.max.y+2,bounds.min.z+(v+.37)/16*size.z);
   const visual=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0)).intersectObject(state.ruined)[0];
   const physical=physics.castRay(new RAPIER.Ray(origin,{x:0,y:-1,z:0}),size.y+3,true);
   expect(Boolean(physical)).toBe(Boolean(visual));if(visual)expect(physical!.timeOfImpact).toBeCloseTo(visual.distance,4);
  }
 }
 physics.free();
});
it('removes hidden native building faces while preserving exterior ray hits and source buffers',async()=>{
 await RAPIER.init();const assets:AssetLibrary=new Map();
 for(const id of ['house_terrace','house_tower','house_terrace_ruined','house_tower_ruined']){const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
 const sourceCounts=()=>[...assets.values()].map(asset=>{let count=0;asset.scene.traverse(o=>{if(o instanceof THREE.Mesh)count+=o.geometry.index?.count??o.geometry.attributes.position.count;});return count;});
 const before=sourceCounts(),physics=new RAPIER.World({x:0,y:0,z:0}),built=createBuildings(new THREE.Scene(),physics,assets,[]);
 for(const [id,mesh] of [['house_terrace',built.states[0].intact],['house_tower',built.states[1].intact],['house_terrace_ruined',built.states[0].ruined],['house_tower_ruined',built.states[1].ruined]] as const){
  const source=assets.get(id)!.scene,box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3());center.y=0;
  const reference=new THREE.Group();reference.add(source.clone(true));reference.position.copy(center).negate();reference.updateMatrixWorld(true);
  const optimized=new THREE.Mesh(mesh.geometry,mesh.material);optimized.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(reference),size=bounds.getSize(new THREE.Vector3()),mid=bounds.getCenter(new THREE.Vector3());
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1])for(let u=0;u<7;u++)for(let v=0;v<7;v++){
   const origin=mid.clone(),direction=new THREE.Vector3();origin.setComponent(axis,mid.getComponent(axis)+sign*(size.getComponent(axis)/2+2));direction.setComponent(axis,-sign);
   const a=(axis+1)%3,b=(axis+2)%3;origin.setComponent(a,bounds.min.getComponent(a)+(u+.31)/7*size.getComponent(a));origin.setComponent(b,bounds.min.getComponent(b)+(v+.43)/7*size.getComponent(b));
   const ray=new THREE.Raycaster(origin,direction),original=ray.intersectObject(reference,true)[0],result=ray.intersectObject(optimized,false)[0];
   expect(Boolean(result),`${id} exterior ray`).toBe(Boolean(original));if(original){expect(result.distance).toBeCloseTo(original.distance,5);expect(result.uv!.x).toBeCloseTo(original.uv!.x,5);expect(result.uv!.y).toBeCloseTo(original.uv!.y,5);}
  }
 }
 expect(sourceCounts()).toEqual(before);physics.free();
});
