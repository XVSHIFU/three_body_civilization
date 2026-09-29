import {paletteUv,sourceTexture} from './source-palette';
import interactionPoints from '../content/assets/interaction-points.json';
import {nativeAnimations,npcMotionSpecs} from './model-animation';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
if(existsSync('content/assets/manifest.json')&&JSON.parse(readFileSync('content/assets/manifest.json','utf8')).some((asset:{export?:{kind:string}})=>asset.export?.kind==='blockbench-native'))throw Error('Production uses reviewed native exports. Edit the .bbmodel sources and re-export; this baseline generator will not overwrite them.');
class NodeFileReader {result:ArrayBuffer|string|null=null;onloadend:(()=>void)|null=null;readAsArrayBuffer(b:Blob){void b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}readAsDataURL(b:Blob){void b.arrayBuffer().then(v=>{this.result=`data:${b.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();});}}
Object.assign(globalThis,{FileReader:NodeFileReader});
type Box={name:string;p:[number,number,number];s:[number,number,number];color:number;pivot?:[number,number,number]};
const stone=0xafa38c,dark=0x4f6267,gold=0xbc9658;
const models:Record<string,Box[]>={
 ruler_cube:[{name:'ruler_1m',p:[0,.5,0],s:[1,1,1],color:stone}],
 wall:[{name:'wall',p:[0,1.5,0],s:[4,3,.5],color:stone}],
 doorway:[{name:'left',p:[-1.5,1.5,0],s:[1,3,.5],color:stone},{name:'right',p:[1.5,1.5,0],s:[1,3,.5],color:stone},{name:'lintel',p:[0,2.75,0],s:[2,.5,.5],color:stone}],
 stairs:Array.from({length:8},(_,i)=>({name:`step_${i}`,p:[0,(i+1)*.125,-i*.5] as [number,number,number],s:[2,(i+1)*.25,.5] as [number,number,number],color:stone})),
 observatory_pillar:[{name:'base',p:[0,.125,0],s:[1.5,.25,1.5],color:dark},{name:'shaft',p:[0,1.55,0],s:[.55,2.6,.55],color:stone},{name:'cap',p:[0,2.95,0],s:[1.2,.1,1.2],color:gold}],
 npc:[{name:'head',p:[0,1.55,0],s:[.35,.4,.35],color:stone,pivot:[0,1.35,0]},{name:'torso',p:[0,1.025,0],s:[.5,.65,.3],color:gold},{name:'arm_l',p:[-.34,1.02,0],s:[.16,.6,.2],color:dark,pivot:[-.34,1.3,0]},{name:'arm_r',p:[.34,1.02,0],s:[.16,.6,.2],color:dark,pivot:[.34,1.3,0]},{name:'leg_l',p:[-.15,.35,0],s:[.2,.7,.23],color:dark,pivot:[-.15,.7,0]},{name:'leg_r',p:[.15,.35,0],s:[.2,.7,.23],color:dark,pivot:[.15,.7,0]}],
 facility:[{name:'back',p:[0,2.5,-5],s:[12,5,.5],color:stone},{name:'left',p:[-6,2.5,0],s:[.5,5,10],color:stone},{name:'right',p:[6,2.5,0],s:[.5,5,10],color:stone},{name:'front_l',p:[-3.5,2.5,5],s:[5,5,.5],color:stone},{name:'front_r',p:[3.5,2.5,5],s:[5,5,.5],color:stone},{name:'lintel',p:[0,4,5],s:[2,2,.5],color:stone},{name:'roof',p:[0,5.25,0],s:[13,.5,11],color:dark}]
};
for(const dir of ['assets/source','public/assets/models','content/assets','content/colliders','licenses'])mkdirSync(dir,{recursive:true});
const entries=[];const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9});
for(const [id,boxes] of Object.entries(models)){
 const textureSize=id==='npc'?64:512;
 const root=new THREE.Group();root.name=id;const elements:unknown[]=[],outliner:unknown[]=[];
 for(const b of boxes){const group=new THREE.Group();group.name=b.name;const pivot=b.pivot??[0,0,0];group.position.fromArray(pivot);const geometry=new THREE.BoxGeometry(...b.s),colors=[];const color=new THREE.Color(b.color);for(let n=0;n<geometry.attributes.position.count;n++)colors.push(color.r,color.g,color.b);geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const mesh=new THREE.Mesh(geometry,material);mesh.position.set(b.p[0]-pivot[0],b.p[1]-pivot[1],b.p[2]-pivot[2]);group.add(mesh);root.add(group);
  const uuid=randomUUID(),groupId=randomUUID();elements.push({name:b.name,uuid,type:'cube',from:b.p.map((v,i)=>(v-b.s[i]/2)*16),to:b.p.map((v,i)=>(v+b.s[i]/2)*16),origin:pivot.map(v=>v*16),rotation:[0,0,0],box_uv:false,color:Math.abs(b.color)%8,faces:Object.fromEntries(['north','south','east','west','up','down'].map(f=>[f,{uv:paletteUv(b.color,textureSize),texture:0}]))});outliner.push({name:b.name,origin:pivot.map(v=>v*16),uuid:groupId,export:true,children:[uuid]});
 }
 const animations:THREE.AnimationClip[]=[];
 if(id==='npc')for(const [name,amplitude,length] of npcMotionSpecs){const tracks:THREE.KeyframeTrack[]=[];for(const bone of ['arm_l','arm_r','leg_l','leg_r']){const a=amplitude*(bone.endsWith('l')?1:-1);const values=(name==='observe'||name==='preserve'?[0,a,a]:[a,-a,a]).flatMap(angle=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),angle).toArray());tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`,[0,length/2,length],values));}animations.push(new THREE.AnimationClip(name,length,tracks));}
 const glb=await new GLTFExporter().parseAsync(root,{binary:true,animations});if(!(glb instanceof ArrayBuffer))throw Error('Expected GLB');writeFileSync(`public/assets/models/${id}.glb`,Buffer.from(glb));
 writeFileSync(`assets/source/${id}.bbmodel`,JSON.stringify({meta:{format_version:'4.10',model_format:'free',box_uv:false},name:id,model_identifier:id,visible_box:[1,1,0],resolution:{width:textureSize,height:textureSize},elements,outliner,textures:[sourceTexture(id,textureSize)],animations:id==='npc'?nativeAnimations(outliner as {name:string;uuid:string}[]):[],animation_variable_placeholders:'',notes:'Original generated generic geometry; 16 editor units = 1m. Source and GLB animation definitions share tools/model-animation.ts; native NPC rotation parity verified; palette source texture and remaining modules require native export validation.'},null,2));
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());const entry={id,interactionPoints:interactionPoints[id as keyof typeof interactionPoints],path:`assets/models/${id}.glb`,version:1,type:id==='npc'?'character':'static',size:size.toArray(),coordinateSystem:'Y-up, metres, ground-centred',materials:1,triangles:boxes.length*12,animations:animations.map(a=>a.name),collider:`content/colliders/${id}.json`,source:`assets/source/${id}.bbmodel`,author:'Project original procedural geometry',license:'Project original; public release decision pending',bytes:glb.byteLength,sha256:createHash('sha256').update(Buffer.from(glb)).digest('hex')};entries.push(entry);
 writeFileSync(`content/assets/${id}.json`,JSON.stringify(entry,null,2));writeFileSync(`content/colliders/${id}.json`,JSON.stringify({id,boxes:boxes.map(b=>({position:b.p,halfExtents:b.s.map(v=>v/2)}))},null,2));root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
}
material.dispose();writeFileSync('content/assets/manifest.json',JSON.stringify(entries,null,2));writeFileSync('licenses/assets.csv','id,author,license,source\n'+entries.map(e=>`${e.id},${e.author},${e.license},${e.source}`).join('\n'));console.log(`Generated ${entries.length} original GLB modules + editable geometry sources. Blockbench UI round-trip remains unverified.`);
