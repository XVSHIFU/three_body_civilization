import {it,expect} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {embeddedModelLoader} from './embedded-model-loader';
import {readFileSync} from 'node:fs';
import {moveNpc,shelterRoute,shelterWaypointReached} from '../src/gameplay/npc-movement';
import {createWorld} from '../src/renderer/world';
import {assetIds,type AssetLibrary} from '../src/renderer/assets';

it('slides along static walls and cannot cut through them while avoiding a player',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
 world.createCollider(RAPIER.ColliderDesc.cuboid(5,2,.25).setTranslation(0,2,-1));world.step();
 let position={x:0,z:0};
 for(let i=0;i<90;i++){
  const next=moveNpc(world,position,{x:position.x+.02,z:position.z-.02},{x:10,z:10},1/60);
  expect(next.z).toBeGreaterThanOrEqual(-.341);expect(Math.hypot(next.x-position.x,next.z-position.z)).toBeLessThanOrEqual(Math.SQRT2*.02+1e-5);position=next;
 }
 expect(position.x).toBeGreaterThan(1);
 const squeezed=moveNpc(world,{x:0,z:-.3},{x:0,z:-.33},{x:0,z:.1},1/60);
 expect(squeezed.z).toBeGreaterThanOrEqual(-.341);
 world.free();
});

it('moves all six NPCs through the actual facility doorway to their separate shelter positions',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0}),assets:AssetLibrary=new Map(),loader=embeddedModelLoader();
 for(const id of assetIds){
  const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
 }
 const built=createWorld(new THREE.Scene(),world,assets);world.step();
 for(const npc of built.npcs){
  const route=shelterRoute(npc.index);let position={x:npc.group.position.x,z:npc.group.position.z},waypoint=npc.waypoint;
  for(let tick=0;tick<6000;tick++){
   const target=route[waypoint],dx=target.x-position.x,dz=target.z-position.z,length=Math.hypot(dx,dz);
   if(shelterWaypointReached(length,waypoint)){if(waypoint===route.length-1)break;waypoint++;continue;}
   // A player occupies the doorway for 30 seconds, then leaves it open.
   const player=tick<1800?{x:-24,z:-25}:{x:70,z:70};
   const stride=Math.min(2/60,length),next=moveNpc(world,position,{x:position.x+dx/length*stride,z:position.z+dz/length*stride},player,1/60);
   expect(Math.hypot(next.x-position.x,next.z-position.z)).toBeLessThanOrEqual(2/60+1e-5);
   expect(Math.hypot(next.x-player.x,next.z-player.z)).toBeGreaterThanOrEqual(.8-1e-6);
   if(tick%30===0)expect(world.intersectionWithShape({x:next.x,y:.9,z:next.z},{x:0,y:0,z:0,w:1},new RAPIER.Capsule(.475,.4),RAPIER.QueryFilterFlags.ONLY_FIXED)).toBeNull();
   position=next;
  }
  const end=route[route.length-1];
  expect(Math.hypot(position.x-end.x,position.z-end.z),`NPC ${npc.index}: ${JSON.stringify(position)}`).toBeLessThan(.15);
 }
 world.free();
});

it('lets six simultaneous evacuees converge without overlap or permanent doorway gridlock',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});
 const assets:AssetLibrary=new Map(),loader=embeddedModelLoader();
 for(const id of assetIds){
  const bytes=readFileSync(`public/assets/models/${id}.glb`);assets.set(id,await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
 }
 const built=createWorld(new THREE.Scene(),world,assets);world.step();
 const actors=built.npcs.map(n=>({index:n.index,position:{x:n.group.position.x,z:n.group.position.z},waypoint:n.waypoint,finishedAt:-1}));
 for(let tick=0;tick<9000;tick++){
  for(const actor of actors){
   if(actor.finishedAt>=0)continue;
   const route=shelterRoute(actor.index),target=route[actor.waypoint],dx=target.x-actor.position.x,dz=target.z-actor.position.z,length=Math.hypot(dx,dz);
   if(shelterWaypointReached(length,actor.waypoint)){if(actor.waypoint===route.length-1)actor.finishedAt=tick;else actor.waypoint++;continue;}
   const neighbours=actors.filter(other=>other!==actor&&(other.finishedAt<0||tick-other.finishedAt<180)).map(other=>other.position);
   const stride=Math.min(2/60,length),player=tick<1800?{x:-24,z:-25}:{x:70,z:70};
   const next=moveNpc(world,actor.position,{x:actor.position.x+dx/length*stride,z:actor.position.z+dz/length*stride},player,1/60,neighbours);
   expect(Math.hypot(next.x-actor.position.x,next.z-actor.position.z)).toBeLessThanOrEqual(2/60+1e-6);
   for(const neighbour of neighbours)expect(Math.hypot(next.x-neighbour.x,next.z-neighbour.z)).toBeGreaterThanOrEqual(.85-1e-6);
   expect(Math.hypot(next.x-player.x,next.z-player.z)).toBeGreaterThanOrEqual(.8-1e-6);
   if(tick%30===0)expect(world.intersectionWithShape({x:next.x,y:.9,z:next.z},{x:0,y:0,z:0,w:1},new RAPIER.Capsule(.475,.4),RAPIER.QueryFilterFlags.ONLY_FIXED)).toBeNull();
   actor.position=next;
  }
  if(actors.every(actor=>actor.finishedAt>=0))break;
 }
 expect(actors.filter(actor=>actor.finishedAt<0)).toEqual([]);
 world.free();
});


