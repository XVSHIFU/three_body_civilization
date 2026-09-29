import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {observatoryLayout} from '../src/renderer/observatory-layout';
import {environmentPlacements} from '../src/renderer/environment';
import {stonePlaques} from '../src/gameplay/wayfinding';
import {paletteUv,sourceTexture} from './source-palette';
type Vec=[number,number,number];
const id='observatory_assembly',elements:any[]=[],outliner:any[]=[];
const uuid=(name:string)=>{const h=createHash('sha256').update(`${id}/${name}`).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const color={stone:0xafa38c,dark:0x4f6267,gold:0xbc9658};
function group(name:string,cubes:any[],position:Vec=[0,0,0],scale:Vec=[1,1,1],yaw=0){
 const origin=position.map(v=>v*16),children:string[]=[];
 for(const [index,cube] of cubes.entries()){
  if(cube.type!=='cube'||cube.rotation?.some((v:number)=>v!==0))throw Error(`Unsupported rotated module ${name}`);
  const element={...structuredClone(cube),name:`${name}_${index}`,uuid:uuid(`${name}/${index}`),from:cube.from.map((v:number,a:number)=>v*scale[a]+origin[a]),to:cube.to.map((v:number,a:number)=>v*scale[a]+origin[a]),origin,rotation:[0,0,0]};
  elements.push(element);children.push(element.uuid);
 }
 outliner.push({name,uuid:uuid(`${name}/group`),origin,rotation:[0,yaw*180/Math.PI,0],export:true,children});
}
function box(name:string,position:Vec,size:Vec,hex:number){
 group(name,[{type:'cube',from:size.map(v=>-v*8),to:size.map(v=>v*8),box_uv:false,color:0,faces:Object.fromEntries(['north','south','east','west','up','down'].map(face=>[face,{uv:paletteUv(hex,512),texture:0}]))}],position);
}
const load=(path:string)=>JSON.parse(readFileSync(path,'utf8')).elements;
const layout=observatoryLayout(),stairs=load('assets/source/stairs.bbmodel'),rails=load('assets/source/environment/railing.bbmodel'),flag=load('assets/source/environment/route_flag.bbmodel');
layout.stairs.forEach((p,i)=>group(`south_stairs_${i}`,stairs,p.position,p.scale));
layout.boxes.forEach((p,i)=>box(p.target??`structure_${i}`,p.position,p.size,color[p.material]));
layout.rails.forEach((p,i)=>group(`rail_${i}`,rails,p.position,[1,1,1],p.yaw));
environmentPlacements().filter(p=>p.id==='route_flag'&&p.position[1]===12).forEach((p,i)=>group(`flag_${i}`,flag,p.position,p.scale,p.yaw));
for(const plaque of stonePlaques.filter(p=>p.id==='observatory-plaque')){
 const [x,y,z]=plaque.position;box('plaque',[x,y+.9,z],[1.4,1.8,.4],color.dark);
 for(let line=0;line<3;line++)box(`plaque_line_${line}`,[x,y+1.35-line*.25,z+.21],[.9-line*.1,.04,.025],color.gold);
}
const source={meta:{format_version:'4.10',model_format:'free',box_uv:false},name:id,model_identifier:id,resolution:{width:512,height:512},elements,outliner,textures:[{...sourceTexture(id,512),uuid:uuid('palette')}],animations:[],notes:'Editable full observatory assembly in world coordinates. 16 units = 1 metre. Generated from shared runtime layout. Production continues to instance individual modules; this file is an art handoff, not an additional runtime asset.'};
const path=`assets/source/observatory/${id}.bbmodel`,data=JSON.stringify(source,null,2)+'\n';
const checkOnly=process.argv.includes('--check');
if(checkOnly&&!existsSync(path))throw Error(`Missing assembly handoff ${path}`);
if(existsSync(path)&&readFileSync(path,'utf8')!==data)throw Error(`Preserve edited assembly before regenerating ${path}`);
if(!checkOnly)writeFileSync(path,data);console.log(`${checkOnly?'Verified shared layout: ':''}${elements.length} editable cubes / ${elements.length*12} triangles: ${path}`);
