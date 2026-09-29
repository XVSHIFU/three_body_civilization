import * as THREE from 'three';
import type {SunView,Vec3} from '../simulation/core';

/** Clip a vertical gnomon's ground projection to its real measuring surface. */
export function projectGnomon(direction:Vec3,height:number,bounds:[number,number,number,number]):[number,number]|null{
 if(direction[1]<=.025)return null;
 const x=-direction[0]*height/direction[1],z=-direction[2]*height/direction[1];
 let fraction=1;
 if(x>0)fraction=Math.min(fraction,bounds[1]/x);else if(x<0)fraction=Math.min(fraction,bounds[0]/x);
 if(z>0)fraction=Math.min(fraction,bounds[3]/z);else if(z<0)fraction=Math.min(fraction,bounds[2]/z);
 return [x*fraction,z*fraction];
}

export class InstrumentShadows {
 private ray=new THREE.Raycaster();
 private instruments=[
  {base:new THREE.Vector3(-10,.258,-8),height:2.8,bounds:[-1.9,1.9,-1.9,1.9] as [number,number,number,number]},
  {base:new THREE.Vector3(18,12.008,-32.8),height:1.6,bounds:[-1.8,1.8,-2,.65] as [number,number,number,number]},
 ];
 private marks:THREE.Mesh<THREE.BoxGeometry,THREE.MeshBasicMaterial>[][];
 constructor(scene:THREE.Scene){
  const geometry=new THREE.BoxGeometry(1,1,1);
  this.marks=this.instruments.map(()=>Array.from({length:3},()=>{
   const mark=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x242922,transparent:true,opacity:.3,depthWrite:false}));
   mark.visible=false;scene.add(mark);return mark;
  }));
 }
 update(suns:SunView[],solid:THREE.Object3D[]){
  this.instruments.forEach((instrument,j)=>suns.forEach((sun,i)=>{
   const mark=this.marks[j][i],endpoint=projectGnomon(sun.direction,instrument.height,instrument.bounds);
   mark.visible=false;if(!endpoint)return;
   // Test the top of the real instrument against local architecture, not sky visibility alone.
   const tip=instrument.base.clone().add(new THREE.Vector3(0,instrument.height+.06,0));
   this.ray.set(tip,new THREE.Vector3(...sun.direction));this.ray.near=.01;this.ray.far=250;
   if(this.ray.intersectObjects(solid,false).length)return;
   const [x,z]=endpoint,length=Math.hypot(x,z);if(length<.025)return;
   mark.visible=true;mark.position.copy(instrument.base).add(new THREE.Vector3(x/2,0,z/2));
   mark.scale.set(.075,.006,length);mark.rotation.y=Math.atan2(x,z);
   mark.material.opacity=Math.min(.55,.12+sun.irradiance*12);
  }));
 }
}
