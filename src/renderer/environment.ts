import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {AssetLibrary} from './assets';
import {partitionInstances} from './instance-partitions';
import {observatoryLayout} from './observatory-layout';
import {removeCoveredTriangles} from './covered-triangles';
import solidVolumes from '../../content/solid-volumes/environment.json';
import assetManifest from '../../content/assets/manifest.json';
import slab from '../../content/colliders/ground_slab.json';
import band from '../../content/colliders/ground_band.json';
import platform from '../../content/colliders/ground_platform.json';
import corner from '../../content/colliders/wall_corner.json';
import railing from '../../content/colliders/railing.json';
import stone from '../../content/colliders/stone_cluster.json';
import crate from '../../content/colliders/supply_crate.json';
import flag from '../../content/colliders/route_flag.json';
type Vec=[number,number,number];
interface Placement {id:string;position:Vec;scale:Vec;yaw:number;collision:boolean}
const definitions=[slab,band,platform,corner,railing,stone,crate,flag];
export function environmentPlacements():Placement[]{
 const placements:Placement[]=[];
 const add=(id:string,position:Vec,scale:Vec=[1,1,1],yaw=0,collision=true)=>placements.push({id,position,scale,yaw,collision});
 // All paving tops are 1cm above the base ground, below the NPC sweep clearance.
 // The road excludes the square to avoid coplanar overlapping surfaces.
 for(let x=-12;x<=12;x+=4)for(let z=-10;z<=10;z+=4)add(x===0?'ground_band':'ground_slab',[x,-.24,z],[1,1,1],0,false);
 for(let z=-18;z<=78;z+=4)if(z<-12||z>12)add('ground_band',[0,-.24,z],[1,1,1],0,false);
 add('ground_platform',[-10,0,-8],[1,.25,1]);
 for(const [x,z,yaw] of [[-72,-72,0],[72,-72,-Math.PI/2],[72,72,Math.PI],[-72,72,Math.PI/2]])add('wall_corner',[x,0,z],[4,10/3,4],yaw);
 for(const rail of observatoryLayout().rails)add('railing',rail.position,[1,1,1],rail.yaw);
 for(const [x,z] of [[-28,38],[27,32],[-57,-19],[60,-36]])add('stone_cluster',[x,0,z]);
 for(const [x,z] of [[-28.5,-12.3],[-28.5,-10.8],[29,30]])add('supply_crate',[x,0,z]);
 for(const [x,y,z,dx,dz] of [[2.8,0,14,0,-1],[-12,0,-15,-12,-8],[-21.5,0,-21,-2.5,-4],[-9,0,-32,-7,8],[17,12,-37,-23.5,3]])add('route_flag',[x,y,z],[1,1,1],Math.atan2(-dz,dx));
 return placements;
}

/** Batch repeated modules by asset and 32m cell; collision uses authored simple boxes. */
export function createEnvironment(scene:THREE.Scene,physics:RAPIER.World,assets:AssetLibrary,solids:THREE.Mesh[]){
 const placements=environmentPlacements(),cells:THREE.InstancedMesh[]=[],colliders:RAPIER.Collider[]=[],removedTriangles:Record<string,number>={};
 const quaternion=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 for(const definition of definitions){
  const source=assets.get(definition.id);if(!source)throw Error(`Environment model missing: ${definition.id}`);
  source.scene.updateMatrixWorld(true);const parts:THREE.BufferGeometry[]=[],materials=new Set<THREE.Material>();
  source.scene.traverse(object=>{if(object instanceof THREE.Mesh){if(Array.isArray(object.material))throw Error('Environment module requires one material');materials.add(object.material);parts.push(object.geometry.clone().applyMatrix4(object.matrixWorld));}});
  // Collision envelopes can contain empty space (especially rails). Only use
  // exact opaque source cubes verified against this native model's hash.
  const volume=solidVolumes.find(v=>v.id===definition.id),hash=assetManifest.find(a=>a.id===definition.id)?.sha256;
  const occluders=volume&&volume.nativeSha256===hash?volume.boxes.map(b=>new THREE.Box3(new THREE.Vector3(...b.min as Vec),new THREE.Vector3(...b.max as Vec))):[];
  removedTriangles[definition.id]=parts.reduce((count,part)=>count+removeCoveredTriangles(part,occluders),0);
  if(materials.size!==1)throw Error('Environment module requires one material');const geometry=mergeGeometries(parts);parts.forEach(part=>part.dispose());
  const transforms=placements.filter(p=>p.id===definition.id).map(p=>{
   quaternion.setFromAxisAngle(up,p.yaw);const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...p.position),quaternion,new THREE.Vector3(...p.scale));
   if(p.collision)for(const box of definition.boxes){const center=new THREE.Vector3(...box.position as Vec).applyMatrix4(matrix);colliders.push(physics.createCollider(RAPIER.ColliderDesc.cuboid(box.halfExtents[0]*p.scale[0],box.halfExtents[1]*p.scale[1],box.halfExtents[2]*p.scale[2]).setTranslation(center.x,center.y,center.z).setRotation(quaternion)));}
   return matrix;
  });
  for(const mesh of partitionInstances(geometry,[...materials][0],transforms)){mesh.name=mesh.name.replace('skyline-cell:',`environment:${definition.id}:`);mesh.castShadow=true;mesh.receiveShadow=true;cells.push(mesh);solids.push(mesh);scene.add(mesh);}
 }
 // Three continuous slabs replace per-tile physics: square, south road, north road.
 for(const [x,z,w,d] of [[0,0,28,24],[0,46,4,68],[0,-16,4,8]])colliders.push(physics.createCollider(RAPIER.ColliderDesc.cuboid(w/2,.125,d/2).setTranslation(x,-.115,z)));
 return {placements,cells,colliders,removedTriangles};
}
