import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {paletteUv} from './source-palette';
type Part={name:string;p:[number,number,number];s:[number,number,number];color:number};
const stone=0xafa38c,dark=0x4f6267,gold=0xbc9658;
// Grounded, axis-aligned remains; gaps and uneven heights replace the flattened shell.
// Bounds remain those of the existing paired shells, so placement and roads do not move.
const ruins:Record<string,Part[]>={
 house_terrace_ruined:[
  {name:'foundation',p:[0,.175,0],s:[8.5,.35,8.5],color:dark},
  {name:'west_wall_high',p:[-3.5,2.1,-2.5],s:[1,4.2,3],color:stone},
  {name:'west_wall_step',p:[-3.5,1.4,0],s:[1,2.8,2],color:stone},
  {name:'rear_wall_stump',p:[-1.75,1.2,-3.5],s:[2.5,2.4,1],color:stone},
  {name:'east_wall_stump',p:[3.5,.75,-2.5],s:[1,1.5,3],color:stone},
  {name:'fallen_roof_band',p:[.5,.8,.5],s:[4.5,.9,1.5],color:dark},
  {name:'fallen_upper_cap',p:[.25,1.45,-.1],s:[2,.4,1],color:gold},
  {name:'front_wall_fragment',p:[-2.5,.65,3.4],s:[2,1.3,1.2],color:stone},
  {name:'front_rubble',p:[1.7,.55,2.8],s:[1.5,1.1,1.8],color:stone},
  {name:'rear_rubble',p:[1.25,.5,-2.5],s:[1.5,1,1.5],color:dark},
  {name:'west_cap_remnant',p:[-3.5,4.35,-3],s:[1,.3,2],color:dark}
 ],
 house_tower_ruined:[
  {name:'foundation',p:[0,.2,.025],s:[6.5,.4,8.55],color:dark},
  {name:'rear_pier_high',p:[-2.5,2.65,-3.4],s:[1,5.3,1.2],color:stone},
  {name:'rear_wall_step',p:[-1.25,1.8,-3.4],s:[1.5,3.6,1.2],color:stone},
  {name:'rear_wall_low',p:[.25,1,-3.4],s:[1.5,2,1.2],color:stone},
  {name:'east_wall_remnant',p:[2.5,1.35,-1.8],s:[1,2.7,3],color:stone},
  {name:'front_pier_remnant',p:[-1.75,1.55,4.15],s:[.5,3.1,.3],color:dark},
  {name:'front_wall_stump',p:[-2,.7,3.5],s:[2,1.4,1],color:stone},
  {name:'fallen_crown',p:[.4,.85,.6],s:[3,1.3,2.5],color:stone},
  {name:'fallen_crown_cap',p:[.7,1.7,.4],s:[2.4,.4,1.5],color:gold},
  {name:'fallen_roof_tier',p:[-.7,.65,2.2],s:[3.8,.5,1.1],color:dark},
  {name:'rear_pier_cap',p:[-2.5,5.45,-3.4],s:[1,.3,1.2],color:dark},
  {name:'front_scattered_stone',p:[1.75,.5,3.4],s:[1.2,1,1.2],color:stone}
 ]
};
const oldHashes:Record<string,string>={house_terrace_ruined:'e18c392fc88b0cee68ac171ad460622fff128092837ad6832286170cd80983f9',house_tower_ruined:'716cbc65e1e713afc8d2cb867a7b330028fa39a1f49dda9c8721553673930683'};
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const uuid=(name:string)=>{const h=sha(name);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const pending:{path:string;data:string;backups:{path:string;bytes:Buffer}[]}[]=[];
for(const [id,parts] of Object.entries(ruins)){
 const sourcePath=`assets/source/buildings/${id}.bbmodel`,designPath=`assets/source/buildings/${id}.design.json`;
 const bytes=readFileSync(sourcePath),source=JSON.parse(bytes.toString()),design=JSON.parse(readFileSync(designPath,'utf8'));
 const elements=parts.map(p=>({name:p.name,uuid:uuid(`${id}/v2/${p.name}/cube`),type:'cube',from:p.p.map((v,i)=>(v-p.s[i]/2)*16),to:p.p.map((v,i)=>(v+p.s[i]/2)*16),origin:[0,0,0],rotation:[0,0,0],box_uv:false,color:0,faces:Object.fromEntries(['north','south','east','west','up','down'].map(face=>[face,{uv:paletteUv(p.color,512),texture:0}]))}));
 const nextSource={...source,elements,outliner:elements.map(e=>({name:e.name,uuid:uuid(`${id}/v2/${e.name}/group`),origin:[0,0,0],export:true,children:[e.uuid]})),notes:'Original ruined shell v2. Grounded broken walls, fallen roof and crown fragments. Fixed original footprint, no simulated debris. 16 units = 1 metre. Native export required after editing.'};
 const nextDesign={...design,version:2,triangles:parts.length*12,size:[0,1,2].map(axis=>(Math.max(...elements.map(e=>e.to[axis]))-Math.min(...elements.map(e=>e.from[axis])))/16),colliders:parts.map(p=>({position:p.p,halfExtents:p.s.map(v=>v/2)})),structuralNames:parts.map(p=>p.name)};
 const data=JSON.stringify(nextSource,null,2)+'\n',designData=JSON.stringify(nextDesign,null,2)+'\n';
 if(bytes.toString()===data&&readFileSync(designPath,'utf8')===designData)continue;
 if(sha(bytes)!==oldHashes[id])throw Error(`Refusing to replace edited source ${sourcePath}`);
 const paths=[sourcePath,designPath,`reports/blockbench/${id}-native.glb`,`reports/blockbench/${id}-source-roundtrip.json`,`public/assets/models/${id}.glb`,`content/assets/${id}.json`,`content/colliders/${id}.json`];
 const backups=paths.map(path=>({path:`.validation/ruins-v1/${path}`,bytes:readFileSync(path)}));
 for(const backup of backups)if(existsSync(backup.path)&&sha(readFileSync(backup.path))!==sha(backup.bytes))throw Error(`Historical backup differs: ${backup.path}`);
 pending.push({path:sourcePath,data,backups},{path:designPath,data:designData,backups:[]});
}
for(const item of pending){for(const backup of item.backups){mkdirSync(dirname(backup.path),{recursive:true});writeFileSync(backup.path,backup.bytes);}writeFileSync(item.path,item.data);}
console.log('Ruins v2 sources prepared; previous originals preserved in .validation/ruins-v1. Native exports and production promotion still required.');
