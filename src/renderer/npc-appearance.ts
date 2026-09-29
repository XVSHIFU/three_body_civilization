import * as THREE from 'three';

type Accessory={name:string;bone:'head'|'torso';position:[number,number,number];size:[number,number,number];color:number};
const stone=0xafa38c,cloth=0x4f6267,gold=0xbc9658;
const hat:Accessory[]=[
 {name:'hat_brim',bone:'head',position:[0,.43,0],size:[.62,.06,.5],color:cloth},
 {name:'hat_crown',bone:'head',position:[0,.55,0],size:[.4,.18,.34],color:cloth},
];
const pack:Accessory={name:'backpack',bone:'torso',position:[0,1.03,-.27],size:[.42,.5,.25],color:stone};
const apron:Accessory={name:'apron',bone:'torso',position:[0,.86,.17],size:[.4,.65,.035],color:stone};
const satchel:Accessory={name:'satchel',bone:'torso',position:[.3,.78,0],size:[.18,.3,.24],color:gold};
export const npcAppearances=[
 {name:'观测员',torso:gold,accessories:hat},
 {name:'设施看守',torso:cloth,accessories:[pack,{...apron,color:gold}]},
 {name:'居民 · 旅人',torso:stone,accessories:[pack]},
 {name:'居民 · 工匠',torso:cloth,accessories:[apron]},
 {name:'居民 · 信使',torso:stone,accessories:[satchel]},
 {name:'居民 · 采集者',torso:cloth,accessories:[hat[0],satchel]},
] as const;

function paint(geometry:THREE.BufferGeometry,hex:number,textured=false){
 if(textured){
  const index=[stone,cloth,gold].indexOf(hex);if(index<0)throw Error('NPC palette color missing');
  const uv=[];for(let i=0;i<geometry.getAttribute('position').count;i++)uv.push((index+.5)/3,.5);
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.deleteAttribute('color');return;
 }
 const color=new THREE.Color(hex),values=[];
 for(let i=0;i<geometry.getAttribute('position').count;i++)values.push(color.r,color.g,color.b);
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(values,3));
}

/** Keep the shared GLB and animation node names intact; appearance is instance-owned. */
export function createNpcAppearance(source:THREE.Object3D,index:number):THREE.Object3D {
 const look=npcAppearances[index];if(!look)throw Error(`Unknown NPC appearance ${index}`);
 const root=source.clone(true),materials=new Map<THREE.Material,THREE.Material>();
 root.userData.appearance=look.name;
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const clone=(material:THREE.Material)=>{if(!materials.has(material))materials.set(material,material.clone());return materials.get(material)!;};
  object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
  object.castShadow=true;object.receiveShadow=true;
 });
 const torso=root.getObjectByName('torso');
 if(!torso)throw Error('NPC torso node missing');
 torso.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry=object.geometry.clone();const ownMaterial=Array.isArray(object.material)?object.material[0]:object.material;paint(object.geometry,look.torso,ownMaterial instanceof THREE.MeshStandardMaterial&&!!ownMaterial.map);}});
 const material=[...materials.values()][0];
 if(!material)throw Error('NPC material missing');
 for(const accessory of look.accessories){
  const bone=root.getObjectByName(accessory.bone);if(!bone)throw Error(`NPC bone missing: ${accessory.bone}`);
  const geometry=new THREE.BoxGeometry(...accessory.size);paint(geometry,accessory.color,material instanceof THREE.MeshStandardMaterial&&!!material.map);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=accessory.name;mesh.position.set(...accessory.position);
  mesh.castShadow=true;mesh.receiveShadow=true;bone.add(mesh);
 }
 return root;
}
