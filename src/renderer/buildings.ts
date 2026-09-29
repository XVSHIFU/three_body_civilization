import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {AssetLibrary} from './assets';
import {removeCoveredTriangles} from './covered-triangles';
import terrace from '../../content/colliders/house_terrace.json';
import tower from '../../content/colliders/house_tower.json';
import terraceRuined from '../../content/colliders/house_terrace_ruined.json';
import towerRuined from '../../content/colliders/house_tower_ruined.json';

export const buildingPlots=[[-38,25,14,16,10],[35,18,17,14,12],[-48,-7,12,14,8],[48,-12,16,18,14],[-48,-48,16,12,9],[48,-49,18,15,12]] as const;
const definitions=[terrace,tower,terraceRuined,towerRuined];
/** One shared merged geometry per source; each placed state has independent visibility and colliders. */
export function createBuildings(scene:THREE.Scene,physics:RAPIER.World,assets:AssetLibrary,solids:THREE.Mesh[]){
 const removedTriangles:Record<string,number>={};
 const templates=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;bounds:THREE.Box3;center:THREE.Vector3}>();
 for(const definition of definitions){
  const source=assets.get(definition.id);if(!source)throw Error(`Building state missing: ${definition.id}`);
  source.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source.scene),center=bounds.getCenter(new THREE.Vector3());center.y=0;
  const parts:THREE.BufferGeometry[]=[],materials=new Set<THREE.Material>();
  source.scene.traverse(object=>{if(object instanceof THREE.Mesh){if(Array.isArray(object.material))throw Error('Building requires one material');materials.add(object.material);parts.push(object.geometry.clone().applyMatrix4(object.matrixWorld).translate(-center.x,0,-center.z));}});
  // Hand-authored structural colliders coincide with opaque source cuboids.
  // Do not infer solid volume from arbitrary mesh bounds (e.g. future doorways).
  const occluders=definition.boxes.map(box=>{const p=new THREE.Vector3(...box.position as [number,number,number]).sub(center),half=new THREE.Vector3(...box.halfExtents as [number,number,number]);return new THREE.Box3(p.clone().sub(half),p.clone().add(half));});
  removedTriangles[definition.id]=parts.reduce((count,part)=>count+removeCoveredTriangles(part,occluders),0);
  if(materials.size!==1)throw Error('Building requires one material');const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());
  templates.set(definition.id,{geometry,material:[...materials][0],bounds,center});
 }
 const states: {intact:THREE.Mesh;ruined:THREE.Mesh;intactColliders:RAPIER.Collider[];ruinedColliders:RAPIER.Collider[]}[]=[];
 for(const [index,[x,z,w,d,h]] of buildingPlots.entries()){
  const id=index%2?'house_tower':'house_terrace',base=templates.get(id)!,size=base.bounds.getSize(new THREE.Vector3());
  const scale=new THREE.Vector3((w+1)/size.x,(h+1.2)/size.y,(d+1)/size.z),yaw=index%3===1?Math.PI:0;
  function place(stateId:string){
   const template=templates.get(stateId)!,mesh=new THREE.Mesh(template.geometry,template.material);mesh.name=`building:${index}:${stateId}`;mesh.position.set(x,0,z);mesh.scale.copy(scale);mesh.rotation.y=yaw;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);mesh.updateMatrixWorld(true);solids.push(mesh);
   const colliders=definitions.find(def=>def.id===stateId)!.boxes.map(box=>{const center=mesh.localToWorld(new THREE.Vector3(...box.position as [number,number,number]).sub(template.center));return physics.createCollider(RAPIER.ColliderDesc.cuboid(box.halfExtents[0]*scale.x,box.halfExtents[1]*scale.y,box.halfExtents[2]*scale.z).setTranslation(center.x,center.y,center.z).setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}));});
   return {mesh,colliders};
  }
  const intact=place(id),ruined=place(`${id}_ruined`);states.push({intact:intact.mesh,ruined:ruined.mesh,intactColliders:intact.colliders,ruinedColliders:ruined.colliders});
 }
 function setDestroyed(destroyed:boolean){for(const state of states){state.intact.visible=!destroyed;state.ruined.visible=destroyed;state.intactColliders.forEach(c=>c.setEnabled(!destroyed));state.ruinedColliders.forEach(c=>c.setEnabled(destroyed));}}
 setDestroyed(false);return {states,setDestroyed,removedTriangles};
}
