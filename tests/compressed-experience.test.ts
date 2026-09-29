import 'fake-indexeddb/auto';
import {expect,it} from 'vitest';
import {selectExperience} from '../src/app/experience';
import {compressedScenario as scenario} from '../src/simulation/scenario';
import {initialEnvironment,advanceEnvironment} from '../src/simulation/environment';
import {freshPreservation,beginPreservation,stepPreservation,outcome} from '../src/gameplay/preservation';
import {ArchiveStore,DB_NAME,emptyArchive,parseImport,type Checkpoint} from '../src/storage/archive';
import {checkpointIssues} from '../src/storage/compatibility';
import {RUNTIME_ID} from '../src/build-info';

it('runs both three-minute outcomes and resumes an in-flight preservation from a serialized checkpoint',()=>{
 let environment=initialEnvironment(scenario),preservation=freshPreservation(),warning=0,deadline=0,restored:Checkpoint|null=null;
 for(let tick=1;tick<=scenario.duration*60;tick++){
  environment=advanceEnvironment(environment,1/60,scenario);
  if(environment.warning&&!warning)warning=tick;
  // Allow 20 actual seconds to retreat, then run the unchanged 12-second action.
  if(warning&&tick===warning+1200)preservation=beginPreservation(preservation);
  preservation=stepPreservation(preservation,1/60,environment.heatLoad,scenario.climate.facilityLimit);
  if(restored){
   Object.assign(restored,advanceEnvironment({...restored,celestialAccumulator:restored.celestialAccumulator!},1/60,scenario));restored.tick=tick;
   restored.preservation=stepPreservation(restored.preservation,1/60,restored.heatLoad,scenario.climate.facilityLimit);
   expect(restored.celestial).toEqual(environment.celestial);
   expect(restored.preservation).toEqual(preservation);
   expect(restored.temperature).toBe(environment.temperature);
  }
  if(warning&&tick===warning+1500){
   const archive=emptyArchive();archive.checkpoint={...environment,runtimeId:RUNTIME_ID,scenarioId:scenario.id,scenarioVersion:scenario.version,integratorVersion:scenario.integratorVersion,tick,position:[-24,.9,-29],yaw:0,pitch:0,preservation,ended:false,outcome:null,motion:{verticalSpeed:0,grounded:true,safePosition:[-24,.9,-29]},npcs:Array.from({length:6},()=>({position:[-24,0,-29],yaw:0,state:'preserved',waypoint:3}))};
   const imported=parseImport(JSON.stringify(archive));
   expect(checkpointIssues(imported,scenario)).toEqual([]);
   expect(checkpointIssues(imported)).toContain('场景版本已变化。');
   restored=imported.checkpoint;
  }
  if(environment.dangerDuration>=scenario.climate.cityLimit){deadline=tick;break;}
 }
 expect(restored).not.toBeNull();expect(deadline/60).toBeGreaterThan(175);expect(deadline/60).toBeLessThan(185);
 expect((deadline-warning)/60).toBeGreaterThan(45);
 expect(outcome(preservation,true,0).individual).toBe('preserved');
 expect(outcome(freshPreservation(),true,0).individual).toBe('lost');
});

it('selects an explicit URL mode and isolates demo saves from the full experience',async()=>{
 const full=selectExperience(''),demo=selectExperience('?experience=compressed');
 expect(selectExperience('?experience=unknown')).toEqual(full);
 expect(demo.scenario.id).toBe('compressed-001');
 expect(selectExperience(demo.alternateHref)).toEqual(full);
 const main=new ArchiveStore(DB_NAME),short=new ArchiveStore(DB_NAME+demo.archiveSuffix);
 await main.open();await short.open();
 try{
  const first=await main.save(emptyArchive());
  const demoArchive=emptyArchive();demoArchive.civilization=3;
  await short.save(demoArchive);
  expect(await main.read()).toEqual(first);
  expect((await short.read())?.civilization).toBe(3);
 }finally{main.close();short.close();}
});

