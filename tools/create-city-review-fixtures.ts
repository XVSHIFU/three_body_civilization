import {writeFileSync} from 'node:fs';
import {initialEnvironment,advanceEnvironment,type EnvironmentState} from '../src/simulation/environment';
import {environmentSky} from '../src/simulation/sky';
import {scenario} from '../src/simulation/scenario';
let environment=initialEnvironment(scenario),tick=0;
const stages:Record<string,{tick:number;environment:EnvironmentState}>={initial:{tick,environment:structuredClone(environment)}};
while(environment.dangerDuration<scenario.climate.cityLimit){
 if(++tick>scenario.duration*60)throw Error('No city deadline');
 environment=advanceEnvironment(environment,1/60,scenario);
 if(!stages.dual&&environmentSky(environment.celestial,environment.celestialAccumulator,scenario).filter(v=>v.aboveHorizon).length===2)stages.dual={tick,environment:structuredClone(environment)};
}
stages.ended={tick,environment:structuredClone(environment)};
if(!stages.dual)throw Error('No dual-sun state');
writeFileSync('reports/fixtures/city-environment-review.json',JSON.stringify({scope:'Environment uses formal 60 Hz updater. Camera and NPC poses in the preview are staged; this is not a played route.',scenarioId:scenario.id,stages},null,2));
console.log(Object.fromEntries(Object.entries(stages).map(([name,s])=>[name,s.tick])));
