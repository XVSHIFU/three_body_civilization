import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const shelterOrigin=[-9,0,-10.5] as const;
export interface ShelterCollider {position:[number,number,number];size:[number,number,number]}
/** Editable metre-scale source. Only this small existing gateway alcove is furnished. */
export function createShelter(){
 const root=new THREE.Group();root.name='preservation-shelter';const collisions:ShelterCollider[]=[];
 const stone=new THREE.MeshStandardMaterial({name:'shelter-stone',color:0xe5e0d6,roughness:1});
 const wood=new THREE.MeshStandardMaterial({name:'shelter-wood',color:0x584530,roughness:.92});
 const bronze=new THREE.MeshStandardMaterial({name:'shelter-bronze',color:0x8b744e,metalness:.4,roughness:.65});
 const cloth=new THREE.MeshStandardMaterial({name:'shelter-cloth',color:0x263645,roughness:1,side:THREE.DoubleSide});
 const linen=new THREE.MeshStandardMaterial({name:'shelter-linen',color:0xbdb39a,roughness:1});
 const water=new THREE.MeshStandardMaterial({name:'shelter-water',color:0x608c97,metalness:.15,roughness:.22});
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material=stone,parent:THREE.Group=root,solid=false){
  const g=new THREE.BoxGeometry(w,h,d);if(m===stone){const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/3,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/3);}
  const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  if(solid)collisions.push({position:[x,y,z],size:[w,h,d]});return mesh;
 }
 box(0,1.55,-3,6.5,3.1,.35,stone,root,true);
 for(const x of [-3,2.7]){box(x,1.55,-1.2,.38,3.1,.38,stone,root,true);box(x,.15,-1.2,.6,.3,.6);box(x,3.14,-1.2,.64,.2,.64,bronze);}
 box(-.15,3.2,-2.1,6.4,.12,2.3,cloth);box(-.15,3.1,-1,6.5,.12,.12,wood);
 // One small shelf, with restrained folded linen. No new active NPCs.
 box(-2.1,1.05,-2.85,1.3,2.1,.07,wood);for(const x of [-2.72,-1.48])box(x,1.05,-2.6,.08,2.1,.58,wood);collisions.push({position:[-2.1,1.05,-2.6],size:[1.4,2.1,.65]});
 for(const y of [.3,.95,1.65]){box(-2.1,y,-2.3,1.4,.09,.65,wood);for(const x of [-2.48,-2.06,-1.64]){box(x,y+.12,-2.3,.32,.14,.45,linen);box(x,y+.21,-2.3,.3,.025,.4,cloth);}}
 // The player's dry body appears here only after dehydration is complete.
 box(-.25,.16,-2.05,2.05,.32,.95,stone,root,true);box(-.25,.67,-2.05,1.75,.7,.75,stone,root,true);box(-.25,1.07,-2.05,2.15,.14,1,stone,root,true);box(-.25,.95,-1.66,1.8,.09,.04,bronze);
 const body=new THREE.Group();body.name='preserved-body';root.add(body);
 box(-.28,1.18,-2.05,.82,.04,.44,linen,body);box(-.91,1.18,-2.05,.28,.035,.3,linen,body);
 for(const z of [-2.18,-1.92])box(.4,1.18,z,.55,.03,.16,linen,body);
 for(const z of [-2.34,-1.76])box(-.26,1.18,z,.7,.025,.12,linen,body);
 for(const x of [-.55,.1])box(x,1.205,-2.05,.075,.008,.47,cloth,body);
 // Low basin: finite tank without machinery; water provision belongs to the authored epilogue.
 box(2.05,.15,-1.9,1.4,.3,1.6,stone,root,true);
 for(const x of [1.42,2.68])box(x,.46,-1.9,.14,.65,1.6,stone,root,true);
 for(const z of [-2.63,-1.17])box(2.05,.46,z,1.4,.65,.14,stone,root,true);
 box(2.05,.64,-1.9,1.12,.015,1.3,water);box(2.05,.42,-1.084,.38,.55,.015,cloth);
 // A visibly reachable waist-high console at the existing approved operation point.
 const consoleRoot=new THREE.Group();consoleRoot.name='preservation-console';root.add(consoleRoot);
 for(const x of [-.5,.5])for(const z of [-.24,.24])box(x,.55,z,.10,1.1,.10,wood,consoleRoot);box(0,.32,0,1.08,.08,.10,wood,consoleRoot);collisions.push({position:[0,.55,0],size:[1.15,1.1,.60]});box(0,1.13,0,1.35,.12,.75,stone,consoleRoot,true);
 box(0,1.208,0,.8,.025,.42,cloth,consoleRoot);box(0,.66,.311,.45,.65,.018,cloth,consoleRoot);
 const seal=new THREE.Mesh(new THREE.TorusGeometry(.105,.009,4,24),bronze);seal.position.set(0,.73,.326);consoleRoot.add(seal);box(0,.72,.326,.014,.32,.012,bronze,consoleRoot);
 // A single marker above the console; matched to the courtyard's existing banner language.
 box(.75,1.8,-2.78,.5,1.3,.025,cloth);const emblem=new THREE.Mesh(new THREE.TorusGeometry(.14,.009,4,24),bronze);emblem.position.set(.75,1.95,-2.756);root.add(emblem);
 root.userData.collisions=collisions;
 // Keep console/body nodes independently addressable; merge static meshes within each group.
 for(const group of [root,consoleRoot,body]){const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();for(const o of [...group.children])if(o instanceof THREE.Mesh){o.updateMatrix();const m=o.material as THREE.Material,parts=batches.get(m)??[];parts.push((o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix));batches.set(m,parts);o.geometry.dispose();group.remove(o);}for(const [m,parts] of batches){const mesh=new THREE.Mesh(mergeGeometries(parts),m);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);parts.forEach(g=>g.dispose());}}
 return root;
}
