import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Editable source for the single courtyard instrument. Units are metres. */
export function createArmillary(){
 const root=new THREE.Group();root.name='courtyard-armillary';
 const brass=new THREE.MeshStandardMaterial({color:0x9c753d,metalness:.78,roughness:.37});
 const dark=new THREE.MeshStandardMaterial({color:0x343d43,metalness:.65,roughness:.48});
 const light=new THREE.MeshStandardMaterial({color:0xd7b776,metalness:.68,roughness:.32});
 function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D=root){const o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m=brass,parent:THREE.Object3D=root){const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o;}
 box(0,.2,0,2.1,.4,2.1,dark);box(0,.49,0,1.8,.18,1.8);box(0,1.13,0,.8,1.1,.8,dark);box(0,1.78,0,1.35,.2,1.35);
 const axes=new THREE.Group();axes.position.y=3.95;axes.rotation.set(.18,0,-.32);root.add(axes);axes.name='observation-rings';
 function ring(radius:number,rotation:[number,number,number],material=brass){const group=new THREE.Group();group.rotation.set(...rotation);axes.add(group);mesh(new THREE.TorusGeometry(radius,.095,4,64),material,group);mesh(new THREE.TorusGeometry(radius+.10,.026,4,64),light,group);mesh(new THREE.TorusGeometry(radius-.10,.026,4,64),light,group);
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,o=box(Math.cos(a)*radius,Math.sin(a)*radius,.11,i%4===0?.15:.065,.024,.025,light,group);o.rotation.z=a;}
  return group;
 }
 ring(2.3,[0,0,0]);ring(2.08,[Math.PI/2,.25,0],dark);ring(1.78,[.65,1.05,.1]);
 const sphere=mesh(new THREE.IcosahedronGeometry(.46,1),dark,axes);sphere.name='central-reference';
 const shaft=mesh(new THREE.CylinderGeometry(.065,.065,5.4,8),brass,axes);shaft.rotation.z=-.2;
 for(const y of [-2.4,2.4])box(0,y,0,.35,.32,.35,light,axes);
 for(const x of [-2.6,2.6]){box(x,2.4,0,.38,4.1,.5,dark);box(x,4.43,0,.75,.18,.75);box(x,.5,0,.85,.8,.9,dark);}
 root.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
 root.traverse(o=>{if(o instanceof THREE.Mesh){const material=o.material as THREE.Material;const parts=batches.get(material)??[];parts.push((o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld));batches.set(material,parts);o.geometry.dispose();}});
 root.clear();for(const [material,parts] of batches){mesh(mergeGeometries(parts),material);parts.forEach(g=>g.dispose());}
 return root;
}

/** Kenney node animation is preserved; clothing is fitted to this one observer. */
export function dressObserver(root:THREE.Object3D){
 root.name='courtyard-observer';
 const cloth=new THREE.MeshStandardMaterial({color:0x253441,roughness:.95});
 const linen=new THREE.MeshStandardMaterial({color:0xb9b09a,roughness:1});
 const gold=new THREE.MeshStandardMaterial({color:0xa68a4e,metalness:.35,roughness:.65});
 root.traverse(o=>{if(o instanceof THREE.Mesh){const old=Array.isArray(o.material)?o.material[0]:o.material;const head=o.name==='head';o.material=head?new THREE.MeshStandardMaterial({map:(old as THREE.MeshBasicMaterial).map,roughness:.86}):o.name.includes('arm')?linen:cloth;o.castShadow=o.receiveShadow=true;}});
 function box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 const torso=root.getObjectByName('torso')!,head=root.getObjectByName('head')!;
 box(torso,0,.22,0,.88,1.50,.64,linen);box(torso,0,.25,-.38,1.02,1.7,.09,cloth);
 for(const x of [-.40,.40]){box(torso,x,.25,-.44,.045,1.7,.02,gold);box(torso,x,.32,.34,.09,1.5,.04,cloth);}
 box(torso,0,.58,.36,.86,.13,.07,cloth);box(torso,0,.58,.41,.17,.17,.04,gold);
 // The source head mesh has a 0.1 node scale; accessories use its local units.
 box(head,0,8.4,0,9.7,1.4,8.7,cloth);box(head,0,9.4,0,7,1.3,6.8,cloth);box(head,0,8.4,4.5,9.5,.45,.25,gold);
 const book=box(torso,0,.53,.72,.78,.07,.55,cloth);book.rotation.x=.35;box(book,0,.05,0,.70,.025,.49,linen);
 return root;
}

export function observerReadingClip(source:THREE.AnimationClip){
 const clip=source.clone();clip.name='read-ledger';
 for(const track of clip.tracks){const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.9,0,track.name.startsWith('arm-left')?-.12:.12));for(let i=0;i<track.values.length;i+=4)q.toArray(track.values,i);}
 return clip;
}

