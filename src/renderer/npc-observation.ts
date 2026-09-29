import * as THREE from 'three';
import type {SunView} from '../simulation/core';

/** The anomaly is observable only when two suns are locally visible from the actor's eyes. */
export function npcObservation(position:THREE.Vector3,suns:SunView[],occluders:THREE.Object3D[]):SunView|null {
 const eye=position.clone().add(new THREE.Vector3(0,1.55,0));
 const ray=new THREE.Raycaster();ray.near=.01;ray.far=250;
 const visible=suns.filter(sun=>{
  if(!sun.aboveHorizon||sun.direction[1]<=.025)return false;
  ray.set(eye,new THREE.Vector3(...sun.direction));
  return ray.intersectObjects(occluders,false).length===0;
 });
 return visible.length>=2?visible.reduce((best,sun)=>sun.irradiance>best.irradiance?sun:best):null;
}

export function idlePhase(index:number,duration:number):number {return ((index*.618033988749895)%1)*duration;}
