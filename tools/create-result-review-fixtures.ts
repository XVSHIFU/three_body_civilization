import {readFileSync,writeFileSync} from 'node:fs';
import {buildIdentity} from './build-identity';
import {initialEnvironment,advanceEnvironment} from '../src/simulation/environment';
import {scenario} from '../src/simulation/scenario';
import {freshPreservation,beginPreservation,stepPreservation,outcome} from '../src/gameplay/preservation';
import {validateArchive,type Archive} from '../src/storage/archive';
const identity=buildIdentity();let environment=initialEnvironment(scenario),protectedPerson=freshPreservation(),tick=0;
while(environment.dangerDuration<scenario.climate.cityLimit){
 if(++tick>scenario.duration*60)throw Error('No city deadline in scenario');
 environment=advanceEnvironment(environment,1/60,scenario);
 if(environment.warning&&protectedPerson.phase==='idle')protectedPerson=beginPreservation(protectedPerson);
 protectedPerson=stepPreservation(protectedPerson,1/60,environment.heatLoad,scenario.climate.facilityLimit);
}
for(const theme of ['a','b','c'] as const)for(const individual of ['preserved','lost'] as const){
 const archive=JSON.parse(readFileSync('reports/fixtures/calibration-review.json','utf8')) as Archive;
 archive.buildId=identity.buildId;archive.settings.theme=theme;archive.settings.fontScale=1.5;
 const position:[number,number,number]=individual==='preserved'?[-24,.9,-29]:[24,12.9,-35],preservation=individual==='preserved'?protectedPerson:freshPreservation();
 archive.checkpoint={...structuredClone(environment),scenarioId:scenario.id,scenarioVersion:scenario.version,integratorVersion:scenario.integratorVersion,runtimeId:identity.runtimeId,tick,position,yaw:0,pitch:0,motion:{verticalSpeed:0,grounded:true,safePosition:[...position]},npcs:Array.from({length:6},(_,i)=>({position:[-27+i,0,-30],yaw:0,state:'preserved',waypoint:3,preserveElapsed:3})),preservation,ended:true,outcome:outcome(preservation,true,archive.observations.filter(o=>o.civilization===archive.civilization).length)};
 writeFileSync(`reports/fixtures/result-${theme}-${individual}.json`,JSON.stringify(validateArchive(archive),null,2)+'\n');
}
console.log(`Six UI-review fixtures generated at simulated deadline tick ${tick}; player/NPC positions are staged, not an input-route replay.`);
