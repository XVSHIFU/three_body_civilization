import {shelterOrigin,type ShelterCollider} from './shelter';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type TargetId='instrument'|'plaque'|'observer'|'facility';
export interface CourtyardTarget {id:TargetId;name:string;object:THREE.Object3D}
export interface CollisionBox {position:[number,number,number];size:[number,number,number]}
export const spawn={x:-3.8,y:.92,z:8.5};
export const platform={x:4,z:-6,height:1.6};
/** Kept independent of decorative geometry so openings remain openings. */
export function courtyardCollisions():CollisionBox[]{
 const boxes:CollisionBox[]=[
  {position:[0,-.5,0],size:[30,1,36]},
  {position:[-14,3,0],size:[1,6,36]},{position:[14,3,0],size:[1,6,36]},
  {position:[0,3,-15],size:[29,6,1]},{position:[0,1,17],size:[29,2,1]},
  {position:[-12,2.7,-5],size:[4,5.4,1.3]},{position:[-4,2.7,-5],size:[4,5.4,1.3]},
  {position:[-8,4.8,-5],size:[4,1.2,1.3]},
  {position:[4,.8,-6.5],size:[8,1.6,7]},
  {position:[4,2.45,-6],size:[2.2,1.7,2.2]},
  {position:[1.4,4.2,-6],size:[.6,3.6,.65]},{position:[6.6,4.2,-6],size:[.6,3.6,.65]},
  {position:[1.4,2,-6],size:[1.04,.8,1.04]},{position:[6.6,2,-6],size:[1.04,.8,1.04]},
  {position:[9,.78,-2.5],size:[2.6,1.55,1.25]},
  {position:[7.25,1,1.5],size:[.85,2,.85]},
  {position:[-.8,.8,3.3],size:[1.3,1.6,.35]},
 ];
 for(let i=0;i<8;i++)boxes.push({position:[4,(i+1)*.1,.75-i*.5],size:[4,(i+1)*.2,.5]});
 for(const x of [1.7,6.3])for(let i=0;i<4;i++)boxes.push({position:[x,.4+i*.2,.5-i],size:[.65,.8+i*.4,1.08]});
 for(const x of [-13,-10.4,-5.6,-2])boxes.push({position:[x,2.9,-4.7],size:[.85,5.8,1.9]});
 for(const x of [-13,-7,-1,5,11])boxes.push({position:[x,3.25,-14.35],size:[.85,6.5,1.35]});
 for(const x of [.1,7.9])boxes.push({position:[x,2.2,-6.8],size:[.35,1.2,5.7]});
 return boxes;
}

const base=()=>`${import.meta.env.BASE_URL}assets/courtyard/`;
export async function createCourtyard(scene:THREE.Scene,world:RAPIER.World){
 const textureLoader=new THREE.TextureLoader();
 async function stone(name:string,tint:number){const [map,normalMap,roughnessMap]=await Promise.all(['Diffuse','nor_gl','Rough'].map(channel=>textureLoader.loadAsync(base()+name+'-'+channel+'.jpg')));map.colorSpace=THREE.SRGBColorSpace;for(const t of [map,normalMap,roughnessMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;}return new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,color:tint,roughness:1,normalScale:new THREE.Vector2(.45,.45)});}
 const [wall,floor,door,character,armillary,shelterModel]=await Promise.all([stone('white_sandstone_blocks_02',0xe5e0d6),stone('large_sandstone_blocks',0xc8c5ba),new GLTFLoader().loadAsync(base()+'doorway.glb'),new GLTFLoader().loadAsync(base()+'observer.glb'),new GLTFLoader().loadAsync(base()+'armillary.glb'),new GLTFLoader().loadAsync(base()+'shelter.glb')]);
 wall.normalScale.setScalar(.22);floor.normalScale.setScalar(.16);floor.roughnessMap=null;floor.roughness=.95;
 const dark=new THREE.MeshStandardMaterial({color:0x394047,roughness:.84});
 const trim=new THREE.MeshStandardMaterial({color:0x8b744e,metalness:.45,roughness:.59});
 const pale=wall.clone();pale.color.set(0xe4d1ac);
 const cloth=new THREE.MeshStandardMaterial({color:0x263645,roughness:1,side:THREE.DoubleSide});
 const staticParts=new Map<THREE.Material,THREE.BufferGeometry[]>();
 function box(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material=wall){
  const g=new THREE.BoxGeometry(w,h,d);const pos=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=g.getAttribute('uv');
  for(let i=0;i<pos.count;i++){const n=[Math.abs(normal.getX(i)),Math.abs(normal.getY(i)),Math.abs(normal.getZ(i))];if(n[1]>.5)uv.setXY(i,pos.getX(i)/3,pos.getZ(i)/3);else if(n[0]>.5)uv.setXY(i,pos.getZ(i)/3,pos.getY(i)/3);else uv.setXY(i,pos.getX(i)/3,pos.getY(i)/3);}
  if(material===floor)for(let i=0;i<pos.count;i++)uv.setXY(i,(Math.abs(normal.getX(i))>.5?pos.getZ(i):pos.getX(i))*.10+.27,(Math.abs(normal.getY(i))>.5?pos.getZ(i):pos.getY(i))*.10+.33);
  g.translate(x,y,z);const parts=staticParts.get(material)??[];parts.push(g);staticParts.set(material,parts);
 }
 for(const c of courtyardCollisions())world.createCollider(RAPIER.ColliderDesc.cuboid(c.size[0]/2,c.size[1]/2,c.size[2]/2).setTranslation(...c.position));
 // Quiet paving joints read at walking distance without becoming tiny colliders.
 box(0,-.08,0,30,.14,36,dark);
 for(let x=-13.5;x<14;x+=1.5)for(let z=-14.5;z<17;z+=1.25)box(x,-.02,z,1.475,.08,1.225,floor);
 for(const x of [-10,-6])box(x,.035,6,.16,.06,21,trim);
 // Enclosing courtyard, with a real archway and a short passage beyond it.
 for(const x of [-14,14]){box(x,2.7,0,1,5.4,36);box(x,5.45,0,1.35,.22,36,pale);}
 box(0,2.7,-15,29,5.4,1);box(0,5.45,-15,29,.22,1.35,pale);box(0,.7,17,29,1.4,.7);box(0,1.45,17,29,.15,1,pale);
 for(const x of [-12,-4]){box(x,2.7,-5,4,5.4,1.3);box(x,5.45,-5,4.3,.2,1.65,pale);}
 box(-8,4.8,-5,4,1.2,1.3);
 // Source kit module used as the dressed opening. Explicit collision above preserves its void.
 door.scene.rotation.y=Math.PI/2;door.scene.updateMatrixWorld(true);const db=new THREE.Box3().setFromObject(door.scene),ds=db.getSize(new THREE.Vector3());door.scene.scale.setScalar(1);const wrapper=new THREE.Group();wrapper.add(door.scene);wrapper.scale.set(4/ds.x,5.4/ds.y,1.4/ds.z);wrapper.position.set(-8,0,-5);scene.add(wrapper);
 door.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.material=pale;o.castShadow=o.receiveShadow=true;const g=o.geometry.clone();const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,Math.abs(n.getX(i))>.5?p.getZ(i)*2:p.getX(i)*2,p.getY(i)*2);o.geometry=g;}});
 wrapper.updateMatrixWorld(true);door.scene.traverse(o=>{if(o instanceof THREE.Mesh){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const vertices=new Float32Array(g.getAttribute('position').array),indices=g.index?new Uint32Array(g.index.array):Uint32Array.from({length:vertices.length/3},(_,i)=>i);world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,indices));g.dispose();}});
 for(const x of [-13,-10.4,-5.6,-2]){box(x,2.9,-4.7,.58,5.8,1.6,pale);box(x,.26,-4.7,.85,.5,1.9,dark);box(x,5.7,-4.7,.85,.22,1.9,trim);box(x,6,-4.7,.7,.35,1.7);}
 for(const x of [-13,-7,-1,5,11]){box(x,3.25,-14.35,.85,6.5,1.35,pale);box(x,6.45,-14.35,1.15,.22,1.6,dark);}
 // Platform: 8 x 20cm steps, 50cm treads; no hidden ramp or widened player.
 box(4,.8,-6.5,8,1.6,7);box(4,1.59,-6.5,8.2,.1,7.2,floor);
 for(let i=0;i<8;i++){box(4,(i+1)*.1,.75-i*.5,4,(i+1)*.2,.5,floor);box(4,(i+1)*.2+.012,.97-i*.5,4,.025,.065,pale);}
 for(const x of [1.7,6.3])for(let i=0;i<4;i++){box(x,.38+i*.2,.5-i, .5,.76+i*.4,1);box(x,.8+i*.4,.5-i,.65,.09,1.08,pale);}
 for(const x of [.1,7.9])for(const z of [-4,-7,-9.5]){box(x,2.1,z,.35,1,.35,dark);box(x,2.65,z,.5,.15,.5,trim);}
 for(const x of [.1,7.9])box(x,2.4,-6.8,.12,.12,5.7,trim);
 const instrument=armillary.scene;instrument.position.set(4,1.6,-6);instrument.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;const m=o.material as THREE.MeshStandardMaterial;if(m.map)m.map.anisotropy=4;}});scene.add(instrument);
 // A hand-height sighting console belongs to the instrument, rather than a distant floating hotspot.
 const consoleRoot=new THREE.Group();consoleRoot.position.set(4,1.6,-3.65);consoleRoot.name='sighting-console';scene.add(consoleRoot);
 // Console silhouette remains within its original collision footprint.
 let consoleStone:THREE.Material=wall;instrument.traverse(o=>{if(o instanceof THREE.Mesh&&(o.material as THREE.Material).name==='instrument-sandstone')consoleStone=o.material as THREE.Material;});
 const consoleParts=new Map<THREE.Material,THREE.BufferGeometry[]>();
 function consoleBox(y:number,w:number,h:number,d:number,material:THREE.Material){const g=new THREE.BoxGeometry(w,h,d);const uv=g.getAttribute('uv'),p=g.getAttribute('position'),n=g.getAttribute('normal');for(let i=0;i<uv.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))*.08+.40,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))*.08+.655);g.translate(0,y,0);const parts=consoleParts.get(material)??[];parts.push(g);consoleParts.set(material,parts);}
 consoleBox(.06,.9,.12,.6,consoleStone);consoleBox(.15,.83,.06,.55,trim);consoleBox(.53,.73,.70,.48,consoleStone);consoleBox(.91,.85,.08,.56,consoleStone);consoleBox(.98,.88,.06,.59,trim);
 const dialGeometry=new THREE.CylinderGeometry(.40,.40,.06,32);dialGeometry.translate(0,1.04,0);consoleParts.get(trim)!.push(dialGeometry);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,g=new THREE.BoxGeometry(.025,.012,.075);g.rotateY(-a);g.translate(Math.cos(a)*.3,1.078,Math.sin(a)*.3);const parts=consoleParts.get(dark)??[];parts.push(g);consoleParts.set(dark,parts);}
 for(const [material,parts] of consoleParts){const m=new THREE.Mesh(mergeGeometries(parts),material);m.castShadow=m.receiveShadow=true;consoleRoot.add(m);parts.forEach(g=>g.dispose());}
 const consoleChart=new THREE.Mesh(new THREE.PlaneGeometry(.55,.48),new THREE.MeshStandardMaterial({map:chartTexture(),roughness:.88,metalness:.25}));consoleChart.position.set(0,.54,.245);consoleRoot.add(consoleChart);
 world.createCollider(RAPIER.ColliderDesc.cuboid(.45,.55,.3).setTranslation(4,2.15,-3.65));
 const observer=character.scene;observer.scale.setScalar(.72);observer.position.set(7.25,0,1.5);observer.rotation.y=-.65;observer.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});scene.add(observer);
 const mixer=new THREE.AnimationMixer(observer);const idle=character.animations.find(c=>c.name==='read-ledger');if(!idle)throw Error('观测员缺少阅读姿态');mixer.clipAction(idle).play();mixer.update(0);
 // Worktable, written charts and a few practical objects, all within the one courtyard.
 box(9,1.42,-2.5,2.7,.18,1.3,dark);for(const x of [7.9,10.1])for(const z of [-2.95,-2.05])box(x,.65,z,.13,1.3,.13,trim);
 function chartTexture(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d')!;c.fillStyle='#263443';c.fillRect(0,0,512,384);c.strokeStyle='#b49b67';c.lineWidth=2;for(const r of [42,85,130]){c.beginPath();c.arc(256,190,r,0,Math.PI*2);c.stroke();}c.beginPath();c.moveTo(50,190);c.lineTo(460,190);c.moveTo(256,30);c.lineTo(256,350);c.stroke();for(let i=0;i<20;i++){const a=i*2.399;c.fillStyle='#c8b58a';c.fillRect(256+Math.cos(a)*120,190+Math.sin(a)*120,3,3);}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const chart=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.1,.08),new THREE.MeshStandardMaterial({map:chartTexture(),roughness:1}));chart.position.set(9,1.96,-2.8);chart.rotation.x=-.35;scene.add(chart);
 for(let i=0;i<3;i++){box(9.8,1.55+i*.06,-2.2,.4,.05,.5,i%2?cloth:pale);}
 const plaque=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.6,.35),wall);plaque.position.set(-.8,.8,3.3);plaque.castShadow=plaque.receiveShadow=true;scene.add(plaque);const plaqueFace=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.3),new THREE.MeshStandardMaterial({map:chartTexture(),roughness:1}));plaqueFace.position.set(-.8,.85,3.481);scene.add(plaqueFace);
 function banner(x:number,y:number,z:number){box(x,y+.95,z,.06,2.3,.06,trim);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.85,2.25),cloth);flag.position.set(x,y,z+.03);scene.add(flag);const emblem=new THREE.Mesh(new THREE.TorusGeometry(.22,.012,4,24),trim);emblem.position.set(x,y+.18,z+.047);scene.add(emblem);box(x,y+.1,z+.06,.022,1.05,.015,trim);box(x,y+.18,z+.06,.60,.022,.015,trim);box(x,y-1.03,z+.06,.85,.045,.025,trim);}
 for(const x of [-12,-4])banner(x,3.5,-4.28);for(const x of [-10,2,10])banner(x,4,-14.4);
 // Warm lantern housings are geometry. Only two cast local light to keep the scene modest.
 const glow=new THREE.MeshStandardMaterial({color:0xf4cc7a,emissive:0xffac39,emissiveIntensity:2.8,roughness:.4});
 function lantern(x:number,y:number,z:number,lit=false){box(x,y,z,.25,.40,.25,glow);box(x,y+.24,z,.42,.08,.42,dark);box(x,y-.24,z,.42,.08,.42,dark);for(const dx of [-.17,.17])for(const dz of [-.17,.17])box(x+dx,y,z+dz,.035,.48,.035,dark);if(lit){const light=new THREE.PointLight(0xffbe61,5,5,2);light.position.set(x,y,z);scene.add(light);}}
 for(const [x,y,z] of [[-10.5,2.1,-3.7],[-5.5,2.1,-3.7],[1.5,2,-3],[6.5,2,-3],[8.1,1.8,-2.2],[-12,1,8],[11,1,7]])lantern(x,y,z,x===-10.5||x===8.1);
 // Small patches of geometric leaves tie stonework to the ground, without blocking the route.
 const leaf=new THREE.MeshStandardMaterial({color:0x586449,roughness:1});
 for(let i=0;i<70;i++){const x=i<35?-12.8+Math.sin(i*12.3)*.6:12.4+Math.sin(i)*.6,z=-12+(i%35)*.75;box(x,.12+(i%3)*.08,z,.23,.22,.2,leaf);}
 for(let i=0;i<35;i++)box(-10.7+Math.sin(i*3)*.22,5.8-i*.12,-4.2,.18,.20,.1,leaf);
 // Low-detail distant silhouettes are scenery, not another explorable map.
 for(let i=0;i<26;i++){const x=-55+i*4.3,z=-48-(i%3)*7,h=6+(i*7%13);box(x,h/2-1,z,3.6,h,4,dark);box(x,h-1,z,2.6,.7,3,dark);}
 for(const [material,parts] of staticParts){const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());const m=new THREE.Mesh(merged,material);m.castShadow=m.receiveShadow=true;scene.add(m);}
 const shelter=shelterModel.scene;shelter.position.set(...shelterOrigin);scene.add(shelter);const shelterRoot=shelter.getObjectByName('preservation-shelter')!;
 shelter.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=o.receiveShadow=true;const m=o.material as THREE.MeshStandardMaterial;if(m.map)m.map.anisotropy=4;}});
 for(const c of shelterRoot.userData.collisions as ShelterCollider[])world.createCollider(RAPIER.ColliderDesc.cuboid(c.size[0]/2,c.size[1]/2,c.size[2]/2).setTranslation(c.position[0]+shelterOrigin[0],c.position[1],c.position[2]+shelterOrigin[2]));
 const dryBody=shelter.getObjectByName('preserved-body')!;dryBody.visible=false;
 const targets:CourtyardTarget[]=[{id:'instrument',name:'观测天象',object:consoleRoot},{id:'plaque',name:'阅读石牌',object:plaque},{id:'observer',name:'与观测员交谈',object:observer},{id:'facility',name:'保存与救助',object:shelter.getObjectByName('preservation-console')!}];
 targets.forEach(t=>t.object.userData.targetId=t.id);plaqueFace.userData.targetId='plaque';
 return {targets,mixer,instrument,observer,shelter,dryBody,animations:character.animations};
}


