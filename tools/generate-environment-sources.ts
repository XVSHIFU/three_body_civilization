import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {paletteUv,sourceTexture} from './source-palette';
type Vec=[number,number,number];
type Part={name:string;position:Vec;size:Vec;color:number;collision:boolean};
const stone=0xafa38c,dark=0x4f6267,gold=0xbc9658;
const part=(name:string,position:Vec,size:Vec,color=stone,collision=true):Part=>({name,position,size,color,collision});
const designs:{id:string;budget:number;role:string;parts:Part[]}[]=[
 {id:'ground_slab',budget:200,role:'Repeatable 4m flat stone floor; place at y=-0.25 for top y=0.',parts:[part('slab',[0,.125,0],[4,.25,4])]},
 {id:'ground_band',budget:200,role:'Repeatable 4m paving band; all upper faces coplanar, no raised line or micro-collider.',parts:[part('west',[-1.05,.125,0],[1.9,.25,4]),part('band',[0,.125,0],[.2,.25,4],dark),part('east',[1.05,.125,0],[1.9,.25,4])]},
 {id:'ground_platform',budget:200,role:'4m square raised plinth; top remains flat. Needs an approach stair when traversable.',parts:[part('base',[0,.4,0],[4,.8,4],dark),part('top',[0,.9,0],[4,.2,4])]},
 {id:'wall_corner',budget:500,role:'90-degree wall junction with 4m outer arms, 0.5m thickness and 3m height; rotate to join wall modules.',parts:[part('east_arm',[0,1.5,-1.75],[4,3,.5]),part('north_arm',[-1.75,1.5,.25],[.5,3,3.5])]},
 {id:'railing',budget:600,role:'2m repeatable safety rail, 1.2m high. One simple collision volume should guard the full span.',parts:[part('left_post',[-.9,.6,0],[.2,1.2,.2],dark),part('right_post',[.9,.6,0],[.2,1.2,.2],dark),part('handrail',[0,1.1,0],[1.6,.2,.2],gold),part('lower_rail',[0,.45,0],[1.6,.15,.15],dark)]},
 {id:'stone_cluster',budget:250,role:'Low angular rubble for non-route edges; keep capsule walking paths clear.',parts:[part('large_stone',[-.25,.35,0],[1,.7,.85]),part('side_stone',[.55,.2,.1],[.6,.4,.65],dark),part('rear_stone',[-.1,.18,-.55],[.55,.36,.45])]},
 {id:'supply_crate',budget:250,role:'Sealed supply crate; static decoration, no inventory or interaction implied.',parts:[part('body',[0,.5,0],[1,1,.8]),part('left_front',[-.4,.5,.415],[.12,1,.03],dark,false),part('right_front',[.4,.5,.415],[.12,1,.03],dark,false),part('left_back',[-.4,.5,-.415],[.12,1,.03],dark,false),part('right_back',[.4,.5,-.415],[.12,1,.03],dark,false),part('top_band',[0,1.015,0],[.16,.03,.8],dark,false)]},
 {id:'route_flag',budget:250,role:'Static stepped pennant points along positive X; rotate to mark actual route direction. No cloth simulation.',parts:[part('foot',[0,.1,0],[.5,.2,.5],dark),part('pole',[0,1.45,0],[.12,2.7,.12],dark),part('cloth',[.5,2.15,0],[.88,.65,.05],gold,false),part('tip_upper',[1.04,2.28,0],[.2,.39,.05],gold,false),part('tip_lower',[1.2,2.38,0],[.12,.19,.05],gold,false)]}
];
const uuid=(name:string)=>{const hash=createHash('sha256').update(name).digest('hex');return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;};
const outputs:{path:string;data:string}[]=[];
for(const {id,budget,role,parts} of designs){
 if(parts.length*12>budget||parts.some(p=>p.size.some(v=>!Number.isFinite(v)||v<=0)||p.position.some(v=>!Number.isFinite(v))))throw Error(`Invalid model ${id}`);
 const elements=parts.map(p=>({name:p.name,uuid:uuid(`${id}/${p.name}/cube`),type:'cube',from:p.position.map((v,i)=>(v-p.size[i]/2)*16),to:p.position.map((v,i)=>(v+p.size[i]/2)*16),origin:[0,0,0],rotation:[0,0,0],box_uv:false,color:0,faces:Object.fromEntries(['north','south','east','west','up','down'].map(face=>[face,{uv:paletteUv(p.color,512),texture:0}]))}));
 const source={meta:{format_version:'4.10',model_format:'free',box_uv:false},name:id,model_identifier:id,resolution:{width:512,height:512},elements,outliner:elements.map(e=>({name:e.name,uuid:uuid(`${id}/${e.name}/group`),origin:[0,0,0],export:true,children:[e.uuid]})),textures:[{...sourceTexture(id,512),uuid:uuid(`${id}/palette`)}],animations:[],notes:`Original environment module. 16 units = 1 metre. ${role}`};
 const boxes=id==='railing'?[{position:[0,.6,0],halfExtents:[1,.6,.1]}]:id==='ground_band'?[{position:[0,.125,0],halfExtents:[2,.125,2]}]:parts.filter(p=>p.collision).map(p=>({position:p.position,halfExtents:p.size.map(v=>v/2)}));
 const design={id,status:'source-only',source:`assets/source/environment/${id}.bbmodel`,triangles:parts.length*12,triangleBudget:budget,materials:1,textureSize:512,unitsPerMeter:16,role,size:[0,1,2].map(axis=>(Math.max(...elements.map(e=>e.to[axis]))-Math.min(...elements.map(e=>e.from[axis])))/16),colliders:boxes,interactionPoints:[],author:'Project original geometry',license:'Project original; public release decision pending',unverified:['Blockbench native GLB export','source/native geometry and palette agreement','browser shading','internal-face cleanup','scene placement and route collision','distance readability']};
 outputs.push({path:`assets/source/environment/${id}.bbmodel`,data:JSON.stringify(source,null,2)+'\n'},{path:`assets/source/environment/${id}.design.json`,data:JSON.stringify(design,null,2)+'\n'});
}
for(const output of outputs)if(existsSync(output.path)&&readFileSync(output.path,'utf8')!==output.data)throw Error(`Preserve edited model before regenerating ${output.path}`);
mkdirSync('assets/source/environment',{recursive:true});for(const output of outputs)writeFileSync(output.path,output.data);
console.log(JSON.stringify(designs.map(d=>({id:d.id,triangles:d.parts.length*12,budget:d.budget}))));
