import {environmentSky} from '../src/simulation/sky';
import {initialEnvironment,advanceEnvironment} from '../src/simulation/environment';
import {mkdirSync,writeFileSync} from 'node:fs';
import {stellarEnergy,surfaceFlux,type Scenario} from '../src/simulation/core';
import {scenario,compressedScenario} from '../src/simulation/scenario';
function replay(s:Scenario,h=s.h){
 const configuration={...s,h};let environment=initialEnvironment(configuration),warningTime:number|null=null,deadline:number|null=null;
 const energy=stellarEnergy(environment.celestial);let maxEnergy=0;
 const samples:{seconds:number;visible:number;temperature:number;flux:number;directions:number[][]}[]=[];
 for(let tick=0;tick<=s.duration*60;tick++){
  if(tick>0)environment=advanceEnvironment(environment,1/60,configuration);
  if(environment.warning&&warningTime===null)warningTime=tick/60;
  if(environment.dangerDuration>=s.climate.cityLimit&&deadline===null)deadline=tick/60;
  maxEnergy=Math.max(maxEnergy,Math.abs((stellarEnergy(environment.celestial)-energy)/energy));
  if(tick%60===0){const suns=environmentSky(environment.celestial,environment.celestialAccumulator,configuration);samples.push({seconds:tick/60,visible:suns.filter(v=>v.direction[1]>.025).length,temperature:environment.temperature,flux:surfaceFlux(suns),directions:suns.map(v=>v.direction)});}
 }
 return {samples,warningTime,deadline,maxEnergy};
}
for(const configuration of [scenario,compressedScenario]){
const compressed=configuration.id===compressedScenario.id;
const normal=replay(configuration),half=replay(configuration,configuration.h/2);
const windows=normal.samples.reduce<{count:number;start:number;end:number}[]>((a,s)=>{const last=a.at(-1);if(last?.count===s.visible)last.end=s.seconds;else a.push({count:s.visible,start:s.seconds,end:s.seconds});return a;},[]);
const maxDirectionDifference=Math.max(...normal.samples.map((s,i)=>Math.max(...s.directions.flatMap((d,j)=>d.map((x,k)=>Math.abs(x-half.samples[i].directions[j][k]))))));
const withdrawal=normal.warningTime!==null&&normal.deadline!==null?normal.deadline-normal.warningTime:null;
const checks={energy:normal.maxEnergy<1e-3,halfStep:maxDirectionDifference<1e-3,orderedWindows:windows.map(w=>w.count).join(',')==='1,2,3',learning:(windows.find(w=>w.count===1)?.end??0)>=(compressed?45:90),withdrawal:withdrawal!==null&&withdrawal>=45,duration:normal.deadline!==null&&normal.deadline>=(compressed?150:600)&&normal.deadline<=(compressed?210:900)};
mkdirSync('reports',{recursive:true});mkdirSync('content/scenarios',{recursive:true});
const report={scenario:configuration,checks,passed:Object.values(checks).every(Boolean),windows,warningTime:normal.warningTime,deadline:normal.deadline,withdrawal,maxEnergyDrift:normal.maxEnergy,maxDirectionDifference,halfStepDeadline:half.deadline};
writeFileSync(compressed?'reports/compressed-scenario-screening.json':'reports/scenario-screening.json',JSON.stringify(report,null,2));writeFileSync(`content/scenarios/${configuration.id}.json`,JSON.stringify(configuration,null,2));writeFileSync(compressed?'reports/compressed-scenario-trace.csv':'reports/scenario-trace.csv','seconds,visible,temperature,flux\n'+normal.samples.map(s=>`${s.seconds},${s.visible},${s.temperature},${s.flux}`).join('\n'));
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;

}
