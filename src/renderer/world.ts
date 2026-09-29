import thermometerColliders from '../../content/colliders/thermometer.json';
import archiveDeskColliders from '../../content/colliders/archive_desk.json';
import {removeCoveredTriangles} from './covered-triangles';
import {buildingPlots,createBuildings} from './buildings';
import {createEnvironment} from './environment';
import {observatoryLayout} from './observatory-layout';
import {partitionInstances} from './instance-partitions';
import {interactionBehavior,type TargetKind,type InteractionBehavior} from '../gameplay/interaction';
export type {TargetKind} from '../gameplay/interaction';
import {stonePlaques} from '../gameplay/wayfinding';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';
import type {AssetLibrary} from './assets';
import {assetPoint} from './asset-points';

export interface Interactable extends InteractionBehavior {stableId:string;displayName:string;kind:TargetKind;object:THREE.Object3D;observationOrigin?:()=>THREE.Vector3;reading?:string[]}
export interface Npc {group:THREE.Group;arms:THREE.Mesh[];legs:THREE.Mesh[];origin:THREE.Vector3;index:number;waypoint:number;preserveElapsed:number;movementSpeed:number;state:'idle'|'observe'|'shelter'|'preserved'}
export function createWorld(scene:THREE.Scene,physics:RAPIER.World,assets?:AssetLibrary){
 const solid:THREE.Mesh[]=[],interactables:Interactable[]=[],npcs:Npc[]=[];
 const importedStatic:THREE.Mesh[]=[];
 const ruins: {mesh:THREE.Mesh;position:THREE.Vector3;scale:THREE.Vector3}[]=[];
 const geometry=new THREE.BoxGeometry(1,1,1);
 const mats={stone:new THREE.MeshStandardMaterial({color:0xafa38c,roughness:.95}),dark:new THREE.MeshStandardMaterial({color:0x4f6267,roughness:1}),sand:new THREE.MeshStandardMaterial({color:0x887f6c,roughness:1}),gold:new THREE.MeshStandardMaterial({color:0xbc9658,roughness:.65}),cloth:new THREE.MeshStandardMaterial({color:0x4e6970,roughness:1})};
 function box(x:number,y:number,z:number,w:number,h:number,d:number,material=mats.stone,collision=true){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(collision){physics.createCollider(RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2).setTranslation(x,y,z));solid.push(m);}return m;}
 box(0,-.5,0,160,1,160,mats.sand);
 const environment=assets?.has('ground_slab')?createEnvironment(scene,physics,assets,solid):undefined;
 // Visible perimeter; no invisible fence.
 for(const x of [-79,79])box(x,5,0,2,10,environment?128:160,mats.dark);
 for(const z of [-79,79])box(0,5,z,environment?128:160,10,2,mats.dark);
 // Main road and public square are visual surfaces, not micro-colliders.
 if(!environment){box(0,.01,30,4,.02,100,mats.stone,false);box(0,.02,0,28,.04,24,mats.stone,false);}
 if(imported('doorway',0,0,24,[2,8/3,6])){box(-9,4,24,10,8,3);box(9,4,24,10,8,3);}else{box(-8,4,24,12,8,3);box(8,4,24,12,8,3);box(0,6.5,24,4,3,3);}
 // Buildings keep central routes open.
 const buildings=assets?.has('house_terrace')?createBuildings(scene,physics,assets,solid):undefined;
 if(!buildings)for(const [x,z,w,d,h] of buildingPlots){const wall=box(x,h/2,z,w,h,d),roof=box(x,h+.6,z,w+1,1.2,d+1,mats.dark);for(const mesh of [wall,roof])ruins.push({mesh,position:mesh.position.clone(),scale:mesh.scale.clone()});}
 function target(kind:TargetKind,name:string,m:THREE.Object3D,id:string=kind,observationOrigin?:()=>THREE.Vector3){m.userData.targetId=id;interactables.push({stableId:id,kind,displayName:name,object:m,observationOrigin,...interactionBehavior(id,kind,()=>{for(let node:THREE.Object3D|null=m;node;node=node.parent)if(!node.visible)return false;return true;})});}
 function imported(id:string,x:number,y:number,z:number,scale:[number,number,number]=[1,1,1],yaw=0){
  const asset=assets?.get(id);if(!asset)return null;
  const root=asset.scene.clone(true);root.name=id;root.position.set(x,y,z);root.scale.set(...scale);root.rotation.y=yaw;scene.add(root);root.updateMatrixWorld(true);
  const definedColliders=id==='thermometer'?thermometerColliders:id==='archive_desk'?archiveDeskColliders:null;
  root.traverse(object=>{if(object instanceof THREE.Mesh){
   object.castShadow=true;object.receiveShadow=true;solid.push(object);if(['wall','doorway','stairs'].includes(id))importedStatic.push(object);
   const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   if(!definedColliders)physics.createCollider(RAPIER.ColliderDesc.cuboid(size.x/2,size.y/2,size.z/2).setTranslation(center.x,center.y,center.z));
  }});
  if(definedColliders)for(const box of definedColliders.boxes){const center=root.localToWorld(new THREE.Vector3(...box.position as [number,number,number])),half=box.halfExtents;physics.createCollider(RAPIER.ColliderDesc.cuboid(half[0]*scale[0],half[1]*scale[1],half[2]*scale[2]).setTranslation(center.x,center.y,center.z).setRotation({x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)}));}
  return root;
 }
 // Pillar is reachable without climbing its block.
 if(!environment)box(-10,.125,-8,4,.25,4,mats.dark);let pillar:THREE.Object3D|null=imported('observatory_pillar',-10,0,-8);if(!pillar){pillar=box(-10,1.55,-8,.65,2.6,.65);box(-10,2.95,-8,1.25,.2,1.25,mats.gold);}target('pillar','观象柱',pillar,'pillar',assets?.has('observatory_pillar')?()=>assetPoint('observatory_pillar','sky_sample',pillar):undefined);
 const thermometer=imported('thermometer',-7.8,0,-6)??box(-7.8,1,-6,0.25,2,.25,mats.gold);target('thermometer','温度仪',thermometer);
 // Archive pavilion, open south.
 if(!imported('wall',-26,0,-14,[2,4/3,2]))box(-26,2,-14,8,4,1);if(!imported('wall',-30,0,-10,[2,4/3,2],Math.PI/2))box(-30,2,-10,1,4,8);if(!imported('wall',-22,0,-10,[2,4/3,2],Math.PI/2))box(-22,2,-10,1,4,8);box(-26,4.2,-10,9,.4,9,mats.dark);
 const archive=imported('archive_desk',-26,0,-11)??box(-26,.8,-11,2,1.6,1,mats.gold);target('archive','档案台',archive);
 // Facility with real 2m doorway on its south wall.
 const facilityRoot=imported('facility',-24,0,-30);if(!facilityRoot){box(-24,2.5,-35,12,5,1);box(-30,2.5,-30,1,5,10);box(-18,2.5,-30,1,5,10);box(-27.5,2.5,-25,5,5,1);box(-20.5,2.5,-25,5,5,1);box(-24,4,-25,2,2,1);box(-24,5.25,-30,13,.5,11,mats.dark);}
 const consolePosition=facilityRoot?assetPoint('facility','console',facilityRoot):new THREE.Vector3(-25.5,1,-27);
 const console=box(consolePosition.x,consolePosition.y,consolePosition.z,0.8,2,.5,mats.gold);target('facility','保存设施 · 操作台',console);
 // Shared module recipe keeps the handoff and live colliders in agreement.
 const observatory=observatoryLayout();
 if(assets?.has('stairs')){for(const stair of observatory.stairs)imported('stairs',...stair.position,stair.scale);}else for(let i=0;i<48;i++){const height=(i+1)*.25;box(24,height/2,-8-i*.5,3,height,.5);}
 for(const part of observatory.boxes){const mesh=box(...part.position,...part.size,mats[part.material]);if(part.target)target('pillar','高台观象仪',mesh,part.target);}
 // Stone reading surfaces sit beside the walking routes, not in the main passage.
 for(const plaque of stonePlaques){
  const [x,y,z]=plaque.position,stone=box(x,y+.9,z,1.4,1.8,.4,mats.dark);
  target('plaque',plaque.title,stone,plaque.id);interactables[interactables.length-1].reading=[...plaque.lines];
  for(let line=0;line<3;line++)box(x,y+1.35-line*.25,z+.21,.9-line*.1,.04,.025,mats.gold,false);
 }
 // Route markers (geometry, distinguishable by shape as well as color).
 if(!environment)for(const [x,z] of [[0,12],[-13,-16],[-24,-22],[-9,-32],[-16,-22]]){box(x,1,z,.15,2,.15,mats.dark,false);box(x-.45,1.75,z,1,.28,.12,mats.gold,false);}
 // Modest repeated skyline via instancing, outside playable boundary.
 const skyline:THREE.Matrix4[]=[],matrix=new THREE.Matrix4();
 for(let i=0;i<44;i++){const angle=i/44*Math.PI*2,r=108+(i%3)*12,h=8+(i*7%19);matrix.compose(new THREE.Vector3(Math.cos(angle)*r,h/2,Math.sin(angle)*r),new THREE.Quaternion(),new THREE.Vector3(5+i%4,h,6));skyline.push(matrix.clone());}const distant=partitionInstances(geometry,mats.dark,skyline);scene.add(...distant);
 for(let i=0;i<6;i++){
  const group=new THREE.Group(),arms:THREE.Mesh[]=[],legs:THREE.Mesh[]=[];const pos=[[-5,-3],[-22,-23],[6,1],[10,-10],[-16,5],[2,-17]][i];
  const part=(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material)=>{const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;group.add(m);return m;};
  part(0,1.5,0,.35,.4,.35,mats.stone);part(0,.98,0,.5,.65,.3,i<2?mats.gold:mats.cloth);for(const x of [-.34,.34])arms.push(part(x,1,0,.16,.6,.2,mats.cloth));for(const x of [-.15,.15])legs.push(part(x,.35,0,.2,.7,.23,mats.dark));group.position.set(pos[0],0,pos[1]);scene.add(group);npcs.push({group,arms,legs,origin:group.position.clone(),index:i,waypoint:i===1?1:0,preserveElapsed:0,movementSpeed:0,state:'idle'});if(i<2)target(i===0?'teacher':'keeper',i===0?'观测员':'设施看守',group);
 }
 function setDestroyed(destroyed:boolean){
  buildings?.setDestroyed(destroyed);
  ruins.forEach(({mesh,position,scale},i)=>{
   const fraction=destroyed?.18+(Math.floor(i/2)%3)*.09:1;
   mesh.position.copy(position);mesh.scale.copy(scale);
   mesh.position.y*=fraction;mesh.scale.y*=fraction;
  });
  mats.stone.color.setHex(destroyed?0x696359:0xafa38c);
  mats.dark.color.setHex(destroyed?0x393b38:0x4f6267);
  if(destroyed)npcs.forEach(n=>n.group.visible=false);
 }
 // Render static architecture in material batches. Keep its original meshes for
 // precise interaction occlusion and keep independent Rapier colliders unchanged.
 const movable=new Set<THREE.Object3D>([...ruins.map(r=>r.mesh),...interactables.map(t=>t.object),...distant]);
 // Only generated, immutable axis-aligned cubes may occlude batch faces.
 // Imported assets and collapsing buildings are deliberately not treated as solid boxes.
 const staticBoxes=scene.children.filter((object):object is THREE.Mesh=>object instanceof THREE.Mesh&&object.geometry===geometry&&!movable.has(object)&&!Array.isArray(object.material));
 const staticBounds=new Map(staticBoxes.map(object=>[object,new THREE.Box3().setFromObject(object)]));
 let removedTriangles=0;
 const batches=new Map<string,{material:THREE.Material;parts:THREE.BufferGeometry[]}>();
 for(const object of [...scene.children,...importedStatic]){
  if(!(object instanceof THREE.Mesh)||(object.geometry!==geometry&&!importedStatic.includes(object))||movable.has(object)||Array.isArray(object.material))continue;
  object.updateMatrixWorld(true);
  const baked=object.geometry.clone().applyMatrix4(object.matrixWorld);
  if(staticBounds.has(object))removedTriangles+=removeCoveredTriangles(baked,[...staticBounds].filter(([other])=>other!==object).map(([,bounds])=>bounds));
  const position=object.getWorldPosition(new THREE.Vector3());
  const key=`${Math.floor(position.x/32)},${Math.floor(position.z/32)}:${object.material.uuid}`;
  const batch:{material:THREE.Material;parts:THREE.BufferGeometry[]}=batches.get(key)??{material:object.material,parts:[]};batch.parts.push(baked);batches.set(key,batch);
  object.removeFromParent();
 }
 for(const [cell,{material,parts}] of batches){
  const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(merged,material);mesh.name=`static-cell:${cell}`;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 }
 const thermometerPointer=thermometer.getObjectByName('pointer');
 const pointerBase=thermometerPointer?.position.y??0;
 function setTemperature(temperature:number){if(thermometerPointer&&Number.isFinite(temperature))thermometerPointer.position.y=pointerBase+(Math.max(-20,Math.min(80,temperature))+20)/100*1.2-.6;}
 return {solid,interactables,npcs,geometry,mats,setDestroyed,removedTriangles,setTemperature};
}





