import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {paletteUv,sourceTexture} from './source-palette';
type Part={name:string;p:[number,number,number];s:[number,number,number];color:number};
const stone=0xafa38c,dark=0x4f6267,gold=0xbc9658;
const models:Record<string,Part[]>={
 house_terrace:[
  {name:'mass',p:[0,3,0],s:[8,6,8],color:stone},
  {name:'roof_rim',p:[0,6.25,0],s:[8.5,.5,8.5],color:dark},
  {name:'upper_room',p:[-1.5,7.25,-1],s:[4,1.5,4],color:stone},
  {name:'upper_cap',p:[-1.5,8.125,-1],s:[4.5,.25,4.5],color:gold},
  ...[-2,0,2].map((x,i)=>({name:`front_recess_${i}`,p:[x,3.5,4.04] as [number,number,number],s:[.75,1.5,.08] as [number,number,number],color:dark})),
  {name:'front_band',p:[0,1,4.04],s:[8,.25,.08],color:dark}
 ],
 house_tower:[
  {name:'mass',p:[0,4,0],s:[6,8,8],color:stone},
  {name:'roof_tier',p:[0,8.25,0],s:[6.5,.5,8.5],color:dark},
  {name:'crown',p:[0,9,0],s:[4,1,5],color:stone},
  {name:'crown_cap',p:[0,9.625,0],s:[4.5,.25,5.5],color:gold},
  ...[-1.75,1.75].map((x,i)=>({name:`front_pier_${i}`,p:[x,4,4.15] as [number,number,number],s:[.5,8,.3] as [number,number,number],color:dark})),
  {name:'high_window',p:[0,6,4.04],s:[1,1.5,.08],color:dark},
  {name:'low_window',p:[0,3,4.04],s:[1,1.5,.08],color:dark}
 ]
};
for(const [id,parts] of Object.entries({...models}))models[`${id}_ruined`]=parts.filter(p=>['mass','roof_rim','roof_tier','front_pier_0'].includes(p.name)).map(p=>({...p,p:[p.p[0],p.p[1]*.25,p.p[2]],s:[p.s[0],p.s[1]*.25,p.s[2]],color:dark}));
const uuid=(name:string)=>{const h=createHash('sha256').update(name).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const outputs:{path:string;data:string}[]=[];
for(const [id,parts] of Object.entries(models)){
 const elements=parts.map(p=>({name:p.name,uuid:uuid(`${id}/${p.name}/cube`),type:'cube',from:p.p.map((v,i)=>(v-p.s[i]/2)*16),to:p.p.map((v,i)=>(v+p.s[i]/2)*16),origin:[0,0,0],rotation:[0,0,0],box_uv:false,color:0,faces:Object.fromEntries(['north','south','east','west','up','down'].map(face=>[face,{uv:paletteUv(p.color,512),texture:0}]))}));
 const source={meta:{format_version:'4.10',model_format:'free',box_uv:false},name:id,model_identifier:id,resolution:{width:512,height:512},elements,outliner:elements.map(e=>({name:e.name,uuid:uuid(`${id}/${e.name}/group`),origin:[0,0,0],export:true,children:[e.uuid]})),textures:[{...sourceTexture(id,512),uuid:uuid(`${id}/palette`)}],animations:[],notes:'Original non-enterable house shell. 16 units = 1 metre. Staged asset: native export, placement and route regression pending.'};
 const design={id,status:'source-only',source:`assets/source/buildings/${id}.bbmodel`,triangles:parts.length*12,triangleBudget:1500,materials:1,textureSize:512,unitsPerMeter:16,role:'Non-enterable backdrop building; no interactive doorway',statePair:id.replace('_ruined',''),destroyed:id.endsWith('_ruined'),size:[0,1,2].map(axis=>(Math.max(...elements.map(e=>e.to[axis]))-Math.min(...elements.map(e=>e.from[axis])))/16),colliders:parts.filter(p=>p.name==='mass').map(p=>({position:p.p,halfExtents:p.s.map(v=>v/2)})),unverified:['native export','placement inside original building footprint','disaster state switch','collision and route regression','distance recognition'],author:'Project original geometry',license:'Project original; public release decision pending'};
 outputs.push({path:`assets/source/buildings/${id}.bbmodel`,data:JSON.stringify(source,null,2)+'\n'},{path:`assets/source/buildings/${id}.design.json`,data:JSON.stringify(design,null,2)+'\n'});
}
for(const {path,data} of outputs)if(existsSync(path)&&readFileSync(path,'utf8')!==data)throw Error(`Preserve edited model before regenerating ${path}`);
mkdirSync('assets/source/buildings',{recursive:true});for(const {path,data} of outputs)writeFileSync(path,data);console.log('Two house shells and two ruined counterparts created; production unchanged.');
