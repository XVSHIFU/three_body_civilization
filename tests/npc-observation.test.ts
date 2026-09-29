import {it,expect} from 'vitest';
import * as THREE from 'three';
import {npcObservation,idlePhase} from '../src/renderer/npc-observation';
import type {SunView} from '../src/simulation/core';

it('looks only toward an anomaly visible from the local eye position',()=>{
 const suns:SunView[]=[{id:'s1',direction:[Math.SQRT1_2,Math.SQRT1_2,0],aboveHorizon:true,irradiance:3},{id:'s2',direction:[-Math.SQRT1_2,Math.SQRT1_2,0],aboveHorizon:true,irradiance:2},{id:'s3',direction:[0,1,0],aboveHorizon:true,irradiance:1}];
 const wall=new THREE.Mesh(new THREE.BoxGeometry(.5,8,4),new THREE.MeshBasicMaterial());wall.position.set(2,4,0);wall.updateMatrixWorld(true);
 expect(npcObservation(new THREE.Vector3(),suns,[])?.id).toBe('s1');
 expect(npcObservation(new THREE.Vector3(),suns,[wall])?.id).toBe('s2');
 expect(npcObservation(new THREE.Vector3(),suns.slice(0,2),[wall])).toBeNull();
 expect(npcObservation(new THREE.Vector3(5,0,0),suns.slice(0,2),[wall])).toBeNull();
 expect(npcObservation(new THREE.Vector3(),[suns[0],{...suns[1],aboveHorizon:false}],[])).toBeNull();
 wall.geometry.dispose();(wall.material as THREE.Material).dispose();
});

it('assigns repeatable distinct idle phases to all six actors within the clip',()=>{
 const phases=Array.from({length:6},(_,i)=>idlePhase(i,2));
 expect(new Set(phases).size).toBe(6);
 expect(phases.every(time=>time>=0&&time<2)).toBe(true);
 expect(idlePhase(4,2)).toBe(phases[4]);
});
