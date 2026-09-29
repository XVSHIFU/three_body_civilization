import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {paletteUv,sourceTexture} from './source-palette';
type Part={name:string;position:[number,number,number];size:[number,number,number];color:number;movable?:boolean};
const stone=0xafa38c,dark=0x4f6267,gold=0xbc9658;
const designs:{id:string;parts:Part[];operation:number[];purpose:string}[]=[
 {id:'thermometer',operation:[0,1.2,.18],purpose:'Temperature snapshot at the instrument; pointer is an independent visual node.',parts:[
  {name:'foot',position:[0,.1,0],size:[.65,.2,.55],color:dark},
  {name:'backplate',position:[0,1.1,0],size:[.45,1.8,.18],color:stone},
  {name:'scale_inset',position:[0,1.12,.1],size:[.24,1.42,.035],color:dark},
  ...[.5,.8,1.1,1.4,1.7].map((y,i)=>({name:`scale_mark_${i}`,position:[.06,y,.125] as [number,number,number],size:[.12,.035,.025] as [number,number,number],color:gold})),
  {name:'pointer',position:[-.055,1.1,.145],size:[.08,.08,.045],color:gold,movable:true},
  {name:'cap',position:[0,2.025,0],size:[.6,.05,.3],color:gold}
 ]},
 {id:'archive_desk',operation:[0,1.15,.5],purpose:'Archive reading surface; approach from positive Z.',parts:[
  {name:'left_support',position:[-.7,.45,0],size:[.3,.9,.75],color:stone},
  {name:'right_support',position:[.7,.45,0],size:[.3,.9,.75],color:stone},
  {name:'crossbar',position:[0,.25,0],size:[1.4,.2,.35],color:dark},
  {name:'reading_slab',position:[0,1,0],size:[2,.2,1.1],color:stone},
  {name:'tablet_left',position:[-.43,1.14,0],size:[.65,.08,.65],color:dark},
  {name:'tablet_right',position:[.32,1.14,0],size:[.65,.08,.65],color:dark},
  ...[-.15,0,.15].map((z,i)=>({name:`inscription_${i}`,position:[-.43,1.185,z] as [number,number,number],size:[.43,.01,.025] as [number,number,number],color:gold})),
  {name:'archive_seal',position:[.32,1.195,0],size:[.15,.03,.15],color:gold}
 ]}
];
const uuid=(name:string)=>{const h=createHash('sha256').update(name).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const outputs:{path:string;data:string}[]=[];
for(const design of designs){
 const elements=design.parts.map(part=>({name:part.name,uuid:uuid(`${design.id}/${part.name}/cube`),type:'cube',from:part.position.map((v,i)=>(v-part.size[i]/2)*16),to:part.position.map((v,i)=>(v+part.size[i]/2)*16),origin:part.position.map(v=>v*16),rotation:[0,0,0],box_uv:false,color:0,faces:Object.fromEntries(['north','south','east','west','up','down'].map(face=>[face,{uv:paletteUv(part.color,512),texture:0}]))}));
 const texture={...sourceTexture(design.id,512),uuid:uuid(`${design.id}/palette`)};
 const model={meta:{format_version:'4.10',model_format:'free',box_uv:false},name:design.id,model_identifier:design.id,resolution:{width:512,height:512},elements,outliner:design.parts.map((part,i)=>({name:part.name,uuid:uuid(`${design.id}/${part.name}/node`),origin:part.position.map(v=>v*16),export:true,children:[elements[i].uuid]})),textures:[texture],animations:[],notes:'Second-batch editable design; 16 units per metre. Native Blockbench export and runtime integration pending.'};
 const specification={id:design.id,status:'source-only',source:`assets/source/second-batch/${design.id}.bbmodel`,triangles:design.parts.length*12,triangleBudget:design.id==='thermometer'?1000:3000,materials:1,textureSize:512,unitsPerMeter:16,approach:'positive Z',interactionPoints:[{id:'operate',position:design.operation,purpose:design.purpose}],movableNodes:design.parts.filter(p=>p.movable).map(p=>p.name),colliders:design.parts.filter(p=>!p.movable&&!p.name.startsWith('scale_')&&!p.name.startsWith('inscription_')).map(p=>({position:p.position,halfExtents:p.size.map(v=>v/2)})),author:'Project original geometry',license:'Project original; public release decision pending',unverified:['native export','5/20/50m recognition','runtime collision and interaction','production integration']};
 outputs.push({path:`assets/source/second-batch/${design.id}.bbmodel`,data:JSON.stringify(model,null,2)+'\n'},{path:`assets/source/second-batch/${design.id}.design.json`,data:JSON.stringify(specification,null,2)+'\n'});
}
for(const {path,data} of outputs)if(existsSync(path)&&readFileSync(path,'utf8')!==data)throw Error(`Preserve edited source before regeneration: ${path}`);
mkdirSync('assets/source/second-batch',{recursive:true});for(const {path,data} of outputs)writeFileSync(path,data);
console.log('Created thermometer and archive desk editable sources and staged handoff specifications.');
