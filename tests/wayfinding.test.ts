import {it,expect} from 'vitest';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {createWorld} from '../src/renderer/world';
import {stonePlaques} from '../src/gameplay/wayfinding';
import {disposeResources} from '../src/renderer/dispose-resources';

it('provides readable stone plaques reachable by the ordinary interaction ray',async()=>{
 await RAPIER.init();const physics=new RAPIER.World({x:0,y:-9.81,z:0}),scene=new THREE.Scene(),world=createWorld(scene,physics);
 scene.updateMatrixWorld(true);
 try{
  for(const definition of stonePlaques){
   const target=world.interactables.find(item=>item.stableId===definition.id)!;
   expect(target.kind).toBe('plaque');expect(target.reading).toEqual(definition.lines);
   const [x,y,z]=definition.position,eye=new THREE.Vector3(x,y+1.62,z+2),center=new THREE.Box3().setFromObject(target.object).getCenter(new THREE.Vector3());
   const ray=new THREE.Raycaster(eye,center.sub(eye).normalize(),0,2.5);
   expect(ray.intersectObjects(world.solid,true)[0]?.object).toBe(target.object);
  }
  const gate=world.interactables.find(item=>item.stableId==='gate-plaque')!;
  expect(new THREE.Box3().setFromObject(gate.object).min.x).toBeGreaterThan(2);
 }finally{disposeResources([scene]);physics.free();}
});
