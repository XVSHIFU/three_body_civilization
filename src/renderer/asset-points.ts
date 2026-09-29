import * as THREE from 'three';
import manifest from '../../content/assets/manifest.json';

/** Positions are in the model's local metre coordinates, before placement/scale. */
export function assetPoint(assetId:string, pointId:string, root:THREE.Object3D):THREE.Vector3 {
  const asset=manifest.find(entry=>entry.id===assetId);
  const point=asset?.interactionPoints.find(entry=>entry.id===pointId);
  if(!point)throw Error(`模型交互点缺失：${assetId}/${pointId}`);
  root.updateWorldMatrix(true,false);
  return root.localToWorld(new THREE.Vector3(...point.position as [number,number,number]));
}
