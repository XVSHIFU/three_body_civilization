import {GameRuntime,type RuntimeView} from '../src/game/runtime';
import {RUNTIME_ID} from '../src/build-info';
import {defaultSettings,type Checkpoint,type Settings} from '../src/storage/archive';
import {freshPreservation,outcome} from '../src/gameplay/preservation';
import {scenario} from '../src/simulation/scenario';
import type {EnvironmentState} from '../src/simulation/environment';
import data from '../reports/fixtures/city-environment-review.json';
import * as THREE from 'three';

const host=document.querySelector<HTMLElement>('#scene')!,status=document.querySelector<HTMLElement>('#status')!,report=document.querySelector<HTMLElement>('#report')!,loadButton=document.querySelector<HTMLButtonElement>('#load')!;
const stage=document.querySelector<HTMLSelectElement>('#stage')!,view=document.querySelector<HTMLSelectElement>('#view')!,quality=document.querySelector<HTMLSelectElement>('#quality')!;
const cameras:Record<string,{position:[number,number,number];yaw:number;pitch:number}>={south:{position:[0,.9,52],yaw:0,pitch:.07},terrace:{position:[-38,.9,47],yaw:0,pitch:.1},tower:{position:[35,.9,40],yaw:0,pitch:.1},platform:{position:[24,12.9,-33],yaw:2.3,pitch:-.22}};
let runtime:GameRuntime|undefined,settings:Settings={...defaultSettings},baseline='',ready=false,lastView:RuntimeView|undefined;
function evidence(){
 if(!runtime||!ready)return;
 const buildings:{name:string;visible:boolean}[]=[],lights:{intensity:number;castShadow:boolean;shadowStrength:number}[]=[];
 runtime.scene.traverse(o=>{if(o.name.startsWith('building:'))buildings.push({name:o.name,visible:o.visible});if(o instanceof THREE.DirectionalLight)lights.push({intensity:o.intensity,castShadow:o.castShadow,shadowStrength:o.shadow.intensity});});
 const now=runtime.checkpoint();
 report.textContent=JSON.stringify({scope:'Paused formal runtime; staged camera and NPCs. Not an input replay or FPS benchmark.',stage:stage.value,view:view.value,quality:settings.quality,tick:now.tick,checkpointUnchanged:JSON.stringify(now)===baseline,visibleBuildings:buildings.filter(o=>o.visible).map(o=>o.name),lights,drawCalls:lastView?.drawCalls,triangles:lastView?.triangles,render:runtime.performanceReport().viewport},null,2);
}
async function load(){
 ready=false;loadButton.disabled=true;stage.disabled=true;view.disabled=true;quality.disabled=true;runtime?.dispose();runtime=undefined;
 try{
  settings={...defaultSettings,quality:quality.value as Settings['quality']};
  const source=data.stages[stage.value as keyof typeof data.stages] as {tick:number;environment:EnvironmentState},camera=cameras[view.value],ended=stage.value==='ended',preservation=freshPreservation();
  const checkpoint:Checkpoint={...structuredClone(source.environment),...camera,tick:source.tick,runtimeId:RUNTIME_ID,scenarioId:scenario.id,scenarioVersion:scenario.version,integratorVersion:scenario.integratorVersion,motion:{grounded:true,verticalSpeed:0,safePosition:[...camera.position]},npcs:[[-5,-3],[-22,-23],[6,1],[10,-10],[-16,5],[2,-17]].map(([x,z],i)=>({position:[x,0,z],yaw:0,state:ended?'preserved':'idle',waypoint:i===1?1:0,preserveElapsed:ended?3:0})),preservation,ended,outcome:ended?outcome(preservation,true,0):null};
  runtime=new GameRuntime(host,settings,1,{view:v=>{lastView=v;evidence();},interact:()=>{},error:m=>{status.textContent=m;},ended:()=>{},checkpoint:()=>{},journal:()=>{},pause:()=>{}},scenario);
  await runtime.initialize(label=>{status.textContent=label;},checkpoint);
  baseline=JSON.stringify(runtime.checkpoint());ready=true;evidence();status.textContent=`已就绪 · tick ${source.tick} · 暂停取景`;
 }catch(error){status.textContent=String(error);runtime?.dispose();runtime=undefined;}
 finally{loadButton.disabled=false;stage.disabled=false;view.disabled=false;quality.disabled=false;}
}
loadButton.addEventListener('click',()=>void load());
quality.addEventListener('change',()=>{settings={...settings,quality:quality.value as Settings['quality']};runtime?.setSettings(settings);evidence();});
window.addEventListener('pagehide',()=>runtime?.dispose(),{once:true});
void load();
