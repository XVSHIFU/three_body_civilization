import {readFileSync} from 'node:fs';
import {embeddedModelLoader} from './embedded-model-loader';
import type {AssetLibrary} from '../src/renderer/assets';
import {assetIds} from '../src/renderer/assets';
import {beforeAll,it,expect} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {PlayerController} from '../src/player/controller';
import * as THREE from 'three';
import {createWorld} from '../src/renderer/world';
beforeAll(async()=>{await RAPIER.init();});
it('stands at 1.62m eye height, stops at walls, climbs 25cm steps',()=>{const w=new RAPIER.World({x:0,y:-9.81,z:0});w.createCollider(RAPIER.ColliderDesc.cuboid(20,.5,20).setTranslation(0,-.5,0));w.createCollider(RAPIER.ColliderDesc.cuboid(.5,2,5).setTranslation(5,2,0));w.createCollider(RAPIER.ColliderDesc.cuboid(2,.125,.5).setTranslation(0,.125,-2));const p=new PlayerController(w,{x:0,y:1,z:0});for(let i=0;i<120;i++){p.move(0,0,1/60);w.step();}expect(p.grounded).toBe(true);expect(p.eye.y).toBeCloseTo(1.63,1);for(let i=0;i<180;i++){p.move(4.2,0,1/60);w.step();}expect(p.body.translation().x).toBeLessThan(4.21);p.setPosition(0,.9,0);for(let i=0;i<30;i++){p.move(0,-4.2,1/60);w.step();}expect(p.body.translation().z).toBeLessThan(-1.6);expect(p.eye.y).toBeGreaterThan(1.75);p.dispose();w.free();});
it.each(['graybox','production'] as const)('walks the %s west evacuation stairs and facility door within 55 metres',async(mode)=>{
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),scene=new THREE.Scene();createWorld(scene,world,await routeAssets(mode));
 const player=new PlayerController(world,{x:18,y:12.9,z:-34});world.step();
 let distance=0,ticks=0,previous=player.body.translation();
 for(const [x,z] of [[-8.5,-34],[-16,-24],[-24,-24],[-24,-27]]){
  let reached=false;
  for(let i=0;i<1200;i++){
   const p=player.body.translation(),dx=x-p.x,dz=z-p.z,length=Math.hypot(dx,dz);
   if(length<.1){reached=true;break;}
   const speed=Math.min(4.2,length*60);player.move(dx/length*speed,dz/length*speed,1/60);world.step();ticks++;
   const next=player.body.translation();distance+=Math.hypot(next.x-previous.x,next.y-previous.y,next.z-previous.z);previous=next;
  }
  expect(reached,`blocked approaching ${x},${z}`).toBe(true);
 }
 expect(distance).toBeLessThanOrEqual(55);expect(ticks/60).toBeLessThan(15);
 expect(player.body.translation().y).toBeLessThan(1);
 player.dispose();world.free();
});
it.each(['graybox','production'] as const)('climbs all 48 %s south steps onto the observatory without a jump',async(mode)=>{
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),scene=new THREE.Scene();createWorld(scene,world,await routeAssets(mode));
 const player=new PlayerController(world,{x:24,y:.9,z:-6});world.step();
 for(let i=0;i<600&&player.body.translation().z>-33;i++){player.move(0,-4.2,1/60);world.step();}
 expect(player.body.translation().z).toBeLessThan(-32);
 expect(player.eye.y).toBeGreaterThan(13.5);
 expect(player.grounded).toBe(true);player.dispose();world.free();
});
it('batches architecture without consuming dynamic scene objects or losing occlusion',()=>{
 const world=new RAPIER.World({x:0,y:-9.81,z:0}),scene=new THREE.Scene();
 const sun=new THREE.Mesh(new THREE.SphereGeometry(1),new THREE.MeshBasicMaterial());scene.add(sun);
 const built=createWorld(scene,world);
 expect(sun.parent).toBe(scene);
 expect(scene.children.filter(o=>o.name.startsWith('static-cell:')).length).toBeGreaterThan(4);
 // This budget covers ordinary merged architecture. Skyline cells are independently
 // culled instances, so counting all cells as simultaneously submitted draws is wrong.
 expect(scene.children.filter(o=>o instanceof THREE.Mesh&&!(o instanceof THREE.InstancedMesh)).length).toBeLessThan(60);
 const skyline=scene.children.filter((o):o is THREE.InstancedMesh=>o instanceof THREE.InstancedMesh);
 expect(skyline.reduce((count,cell)=>count+cell.count,0)).toBe(44);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,2,0),new THREE.Vector3(0,0,1),0,30);
 expect(ray.intersectObjects(built.solid,false).length).toBe(0);
 ray.set(new THREE.Vector3(5,2,0),new THREE.Vector3(0,0,1));
 expect(ray.intersectObjects(built.solid,false).length).toBeGreaterThan(0);
 world.free();
});

async function routeAssets(mode:'graybox'|'production'){
 if(mode==='graybox')return undefined;
 const assets:AssetLibrary=new Map(),loader=embeddedModelLoader();
 for(const id of assetIds){
  const bytes=readFileSync(`public/assets/models/${id}.glb`);
  assets.set(id,await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
 }
 return assets;
}
