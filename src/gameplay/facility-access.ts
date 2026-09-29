import * as THREE from 'three';

export function insideFacility(position:{x:number;y:number;z:number}):boolean {
 return position.x>=-29&&position.x<=-19&&position.z>=-34&&position.z<=-25&&position.y>=0&&position.y<=2;
}

export function canStartPreservation(position:{x:number;y:number;z:number},eyePosition:{x:number;y:number;z:number},console:THREE.Object3D,solids:THREE.Object3D[]):boolean {
 if(!insideFacility(position))return false;
 const eye=new THREE.Vector3(eyePosition.x,eyePosition.y,eyePosition.z);
 const bounds=new THREE.Box3().setFromObject(console);
 if(bounds.distanceToPoint(eye)>2.5)return false;
 const direction=bounds.getCenter(new THREE.Vector3()).sub(eye),distance=direction.length();
 if(distance<.001)return true;
 const ray=new THREE.Raycaster(eye,direction.normalize(),.01,distance);
 return !ray.intersectObjects(solids.filter(object=>object!==console),true).some(hit=>{
  for(let object:THREE.Object3D|null=hit.object;object;object=object.parent)if(object===console)return false;
  return true;
 });
}

