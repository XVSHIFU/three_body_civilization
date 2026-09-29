import * as THREE from 'three';
import type {Interactable} from './world';
import type {InteractionContext} from '../gameplay/interaction';

export function interactionTarget(ray:THREE.Raycaster,solids:THREE.Object3D[],targets:Interactable[],context:InteractionContext):Interactable|null {
 for(const target of targets)target.object.updateWorldMatrix(true,true);
 const hits=ray.intersectObjects([...new Set([...solids,...targets.map(target=>target.object)])],true);
 for(const hit of hits){
  let hidden=false,id:string|undefined;
  for(let object:THREE.Object3D|null=hit.object;object;object=object.parent){
   if(!object.visible)hidden=true;
   if(id===undefined&&typeof object.userData.targetId==='string')id=object.userData.targetId;
  }
  if(hidden)continue;
  // The nearest visible solid blocks everything behind it, even when it has no action.
  return targets.find(target=>target.stableId===id&&target.canInteract(context))??null;
 }
 return null;
}
