import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Editable source for the single courtyard instrument. Units are metres. */
export function createArmillary(){
 const root=new THREE.Group();root.name='courtyard-armillary';
 const brass=new THREE.MeshStandardMaterial({name:'aged-bronze',color:0x967343,metalness:.65,roughness:.62});
 const dark=new THREE.MeshStandardMaterial({name:'engraved-celestial-bronze',color:0x303c3c,metalness:.5,roughness:.72});
 const stone=new THREE.MeshStandardMaterial({name:'instrument-sandstone',color:0xeee5d2,roughness:.95});
 function mesh(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D=root){const o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m=brass,parent:THREE.Object3D=root){
  const g=m===stone&&h>.18?new RoundedBoxGeometry(w,h,d,1,.018):new THREE.BoxGeometry(w,h,d);
  // Select a quiet patch of the existing stone atlas, at a consistent physical scale.
  if(m===stone){const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))*.08+.40,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))*.08+.655);}
  const o=mesh(g,m,parent);o.position.set(x,y,z);return o;
 }
 function drum(x:number,y:number,z:number,r:number,h:number,m=brass,parent:THREE.Object3D=root){const o=mesh(new THREE.CylinderGeometry(r,r,h,24),m,parent);o.position.set(x,y,z);return o;}
 // Layered plinth: same footprint and upper support height as the first sample.
 box(0,.10,0,2.1,.20,2.1,stone);box(0,.24,0,1.97,.08,1.97,dark);
 box(0,.39,0,1.83,.22,1.83,stone);box(0,.54,0,1.9,.08,1.9);
 box(0,1.06,0,1.56,.96,1.56,stone);box(0,1.57,0,1.73,.10,1.73,stone);
 box(0,1.66,0,1.63,.07,1.63);drum(0,1.77,0,.65,.16);drum(0,1.90,0,.49,.10,dark);
 box(0,1.99,0,1.35,.12,.85);
 // A shallow astronomical engraving, not a raised mass of ornament.
 const medallion=mesh(new THREE.TorusGeometry(.31,.009,4,48),brass);medallion.position.set(0,1.06,.788);
 for(const scale of [.62,1.55]){const o=mesh(new THREE.TorusGeometry(.29,.007,4,48),brass);o.position.set(0,1.06,.789);o.scale.set(scale,.55,1);}
 for(const x of [-.58,.58])for(const y of [.72,1.40]){const bolt=mesh(new THREE.CylinderGeometry(.025,.025,.012,8),brass);bolt.rotation.x=Math.PI/2;bolt.position.set(x,y,.791);}
 const axes=new THREE.Group();axes.position.y=3.95;axes.rotation.set(.18,0,-.32);root.add(axes);axes.name='observation-rings';
 function ring(radius:number,rotation:[number,number,number],material=brass){const group=new THREE.Group();group.rotation.set(...rotation);axes.add(group);mesh(new THREE.TorusGeometry(radius,.095,4,64),material,group);mesh(new THREE.TorusGeometry(radius+.10,.022,4,64),brass,group);mesh(new THREE.TorusGeometry(radius-.10,.022,4,64),brass,group);
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2,o=box(Math.cos(a)*radius,Math.sin(a)*radius,.11,i%4===0?.15:.065,.024,.025,brass,group);o.rotation.z=a;}
  return group;
 }
 ring(2.3,[0,0,0]);ring(2.08,[Math.PI/2,.25,0],dark);ring(1.78,[.65,1.05,.1]);
 const sphere=mesh(new THREE.SphereGeometry(.46,24,16),dark,axes);sphere.name='central-reference';
 // Fine inlaid meridians and parallels retain the small original globe silhouette.
 for(let i=0;i<6;i++){const o=mesh(new THREE.TorusGeometry(.463,.006,3,32),brass,axes);o.rotation.y=i*Math.PI/6;}
 for(const latitude of [-Math.PI/3,-Math.PI/6,0,Math.PI/6,Math.PI/3]){const o=mesh(new THREE.TorusGeometry(.464*Math.cos(latitude),.006,3,32),brass,axes);o.rotation.x=Math.PI/2;o.position.y=.464*Math.sin(latitude);}
 const shaft=mesh(new THREE.CylinderGeometry(.065,.065,5.4,12),brass,axes);shaft.rotation.z=-.2;
 for(const y of [-2.4,-.52,.52,2.4]){const collar=drum(Math.sin(.2)*y,Math.cos(.2)*y,0,y===-.52||y===.52?.105:.13,.14,brass,axes);collar.rotation.z=-.2;}
 // Clear bearing housings at both column heads; connecting journals meet the outer ring.
 for(const x of [-2.6,2.6]){
  box(x,.10,0,1.04,.20,1.04,stone);box(x,.23,0,.97,.06,.97,brass);
  box(x,.46,0,.84,.40,.84,stone);box(x,.70,0,.90,.08,.90,stone);box(x,.79,0,.70,.08,.70,brass);
  for(let i=0;i<6;i++)box(x,1.06+i*.50,0,.56,.49,.60,stone);
  box(x,1.18,0,.61,.10,.65,brass);box(x,3.62,0,.62,.13,.66,brass);
  box(x,3.96,0,.60,.54,.65,stone);box(x,4.27,0,.70,.09,.74,dark);box(x,4.38,0,.78,.13,.78,stone);
  const bearing=drum(x,4.04,0,.23,.72);bearing.rotation.z=Math.PI/2;
  const hub=drum(x,4.04,0,.14,.78,dark);hub.rotation.z=Math.PI/2;
  for(const y of [1.18,3.62])for(const dx of [-.19,.19]){const bolt=mesh(new THREE.CylinderGeometry(.032,.032,.025,8),brass);bolt.rotation.x=Math.PI/2;bolt.position.set(x+dx,y,.338);}
 }
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

