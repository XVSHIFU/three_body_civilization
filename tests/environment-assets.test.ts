import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {embeddedModelLoader} from './embedded-model-loader';
import {assetIds,type AssetLibrary} from '../src/renderer/assets';
import {createEnvironment,environmentPlacements} from '../src/renderer/environment';
import {createWorld} from '../src/renderer/world';
import solidVolumes from '../content/solid-volumes/environment.json';
import {createHash} from 'node:crypto';
it('instances all eight environment families and keeps paving render/collision heights continuous across joins',async()=>{
 await RAPIER.init();const assets:AssetLibrary=new Map();
 for(const id of ['ground_slab','ground_band','ground_platform','wall_corner','railing','stone_cluster','supply_crate','route_flag']){const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
 const physics=new RAPIER.World({x:0,y:-9.81,z:0}),scene=new THREE.Scene(),solids:THREE.Mesh[]=[],built=createEnvironment(scene,physics,assets,solids);physics.step();scene.updateMatrixWorld(true);
 expect(new Set(built.placements.map(p=>p.id)).size).toBe(8);expect(built.cells.reduce((n,c)=>n+c.count,0)).toBe(built.placements.length);expect(built.cells.length).toBeLessThan(built.placements.length/2);
 for(const cell of built.cells){expect(cell.boundingBox).not.toBeNull();expect(cell.boundingSphere).not.toBeNull();expect(solids).toContain(cell);}
 // Square/road boundary, repeated road joins, and square cross-tile joins.
 for(const [x,z] of [[0,12],[0,16],[0,32],[0,64],[0,-12],[0,-16],[2,2],[6,2],[10,6]])for(const offset of [-.001,.001]){
  const origin={x:x+offset,y:2,z:z+offset},physical=physics.castRay(new RAPIER.Ray(origin,{x:0,y:-1,z:0}),3,true),visual=new THREE.Raycaster(new THREE.Vector3(origin.x,origin.y,origin.z),new THREE.Vector3(0,-1,0),0,3).intersectObjects(built.cells,false)[0];
  expect(physical).not.toBeNull();expect(visual).toBeTruthy();expect(2-physical!.timeOfImpact).toBeCloseTo(.01,5);expect(visual.point.y).toBeCloseTo(.01,5);
 }
 // Corner joins remain real L shapes, not solid square fences.
 expect(physics.castRay(new RAPIER.Ray({x:-76,y:2,z:-76},{x:1,y:0,z:0}),10,true)).toBeNull();
 expect(physics.castRay(new RAPIER.Ray({x:-76,y:2,z:-76},{x:-1,y:0,z:0}),10,true)?.timeOfImpact).toBeCloseTo(2,5);
 // Authored flag +X axis points toward its actual route destination after yaw.
 const highFlag=built.placements.find(p=>p.id==='route_flag'&&p.position[1]===12)!;
 const heading=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),highFlag.yaw),route=new THREE.Vector3(-23.5,0,3).normalize();expect(heading.dot(route)).toBeCloseTo(1,6);
 physics.free();
});
it('preserves native environment exterior hits and palette UVs when removing internal faces',async()=>{
 await RAPIER.init();const assets:AssetLibrary=new Map();
 for(const volume of solidVolumes){const bytes=readFileSync(`public/assets/models/${volume.id}.glb`);expect(createHash('sha256').update(bytes).digest('hex')).toBe(volume.nativeSha256);expect(createHash('sha256').update(readFileSync(`assets/source/environment/${volume.id}.bbmodel`)).digest('hex')).toBe(volume.sourceSha256);assets.set(volume.id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
 const buffers=()=>[...assets.values()].map(asset=>{const data:unknown[]=[];asset.scene.traverse(o=>{if(o instanceof THREE.Mesh)data.push(Array.from(o.geometry.attributes.position.array),Array.from(o.geometry.index!.array));});return data;});
 const before=buffers(),physics=new RAPIER.World({x:0,y:0,z:0}),built=createEnvironment(new THREE.Scene(),physics,assets,[]);
 expect(Object.values(built.removedTriangles).reduce((a,b)=>a+b,0)).toBeGreaterThan(0);
 for(const volume of solidVolumes){
  const original=assets.get(volume.id)!.scene;original.updateMatrixWorld(true);
  const cell=built.cells.find(c=>c.name.startsWith(`environment:${volume.id}:`))!,optimized=new THREE.Mesh(cell.geometry,cell.material);optimized.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(original),size=bounds.getSize(new THREE.Vector3()),mid=bounds.getCenter(new THREE.Vector3());
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   const targets:THREE.Vector3[]=[];for(let u=0;u<9;u++)for(let v=0;v<9;v++){const p=mid.clone(),a=(axis+1)%3,b=(axis+2)%3;p.setComponent(a,bounds.min.getComponent(a)+(u+.31)/9*size.getComponent(a));p.setComponent(b,bounds.min.getComponent(b)+(v+.43)/9*size.getComponent(b));targets.push(p);}
   // Also probe every part's center, including thin posts, bands and straps.
   for(const box of volume.boxes)targets.push(new THREE.Vector3(...box.min as [number,number,number]).add(new THREE.Vector3(...box.max as [number,number,number])).multiplyScalar(.5));
   for(const origin of targets){origin.setComponent(axis,mid.getComponent(axis)+sign*(size.getComponent(axis)/2+2));const direction=new THREE.Vector3().setComponent(axis,-sign),ray=new THREE.Raycaster(origin,direction),a=ray.intersectObject(original,true)[0],b=ray.intersectObject(optimized,false)[0];expect(Boolean(b),`${volume.id} exterior`).toBe(Boolean(a));if(a){expect(b.distance).toBeCloseTo(a.distance,5);expect(b.uv!.x).toBeCloseTo(a.uv!.x,5);expect(b.uv!.y).toBeCloseTo(a.uv!.y,5);}}
  }
 }
 expect(buffers()).toEqual(before);physics.free();
});
it('supports every railing post on the real observatory platform while leaving both escape mouths open',async()=>{
 await RAPIER.init();const assets:AssetLibrary=new Map();
 for(const id of assetIds){const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
 const scene=new THREE.Scene(),physics=new RAPIER.World({x:0,y:-9.81,z:0}),world=createWorld(scene,physics,assets);physics.step();scene.updateMatrixWorld(true);
 const rails=environmentPlacements().filter(p=>p.id==='railing'),supports=world.solid.filter(mesh=>!mesh.name.startsWith('environment:railing:'));
 expect(rails.length).toBeGreaterThan(0);
 for(const rail of rails)for(const postX of [-.9,.9]){
  const foot=new THREE.Vector3(postX,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),rail.yaw).add(new THREE.Vector3(...rail.position));
  const hit=new THREE.Raycaster(foot.clone().add(new THREE.Vector3(0,.01,0)),new THREE.Vector3(0,-1,0),0,.1).intersectObjects(supports,false)[0];
  expect(hit,`unsupported post ${foot.toArray()}`).toBeTruthy();expect(hit.point.y).toBeCloseTo(foot.y,5);
 }
 // Rays at body height through the south landing and west departure.
 expect(physics.castRay(new RAPIER.Ray({x:24,y:12.8,z:-31},{x:0,y:0,z:-1}),3,true)).toBeNull();
 expect(physics.castRay(new RAPIER.Ray({x:18,y:12.8,z:-34},{x:-1,y:0,z:0}),4,true)).toBeNull();
 physics.free();
});
