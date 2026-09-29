import {expect,it} from 'vitest';
import {initialEnvironment,advanceEnvironment} from '../src/simulation/environment';
import {scenario} from '../src/simulation/scenario';
import {freshPreservation,beginPreservation,stepPreservation,outcome} from '../src/gameplay/preservation';

it('resumes exactly across a JSON save between celestial integration steps',()=>{
  let uninterrupted=initialEnvironment(scenario);
  for(let i=0;i<1001;i++)uninterrupted=advanceEnvironment(uninterrupted,1/60,scenario);
  expect(uninterrupted.celestialAccumulator).toBeGreaterThan(0);
  let restored=JSON.parse(JSON.stringify(uninterrupted));
  for(let i=0;i<4000;i++){
    uninterrupted=advanceEnvironment(uninterrupted,1/60,scenario);
    restored=advanceEnvironment(restored,1/60,scenario);
  }
  expect(restored).toEqual(uninterrupted);
});

it('replays the screened scenario through both individual outcomes at the same city deadline',()=>{
  let environment=initialEnvironment(scenario),protectedPerson=freshPreservation();
  let warningTick:number|null=null,deadlineTick:number|null=null;
  for(let tick=1;tick<=scenario.duration*60;tick++){
    environment=advanceEnvironment(environment,1/60,scenario);
    if(environment.warning&&warningTick===null){warningTick=tick;protectedPerson=beginPreservation(protectedPerson);}
    protectedPerson=stepPreservation(protectedPerson,1/60,environment.heatLoad,scenario.climate.facilityLimit);
    if(environment.dangerDuration>=scenario.climate.cityLimit){deadlineTick=tick;break;}
  }
  expect(warningTick).not.toBeNull();expect(deadlineTick).not.toBeNull();
  expect(deadlineTick!/60).toBeGreaterThanOrEqual(600);
  expect((deadlineTick!-warningTick!)/60).toBeGreaterThanOrEqual(45);
  expect(outcome(protectedPerson,true,0)).toMatchObject({city:'destroyed',individual:'preserved'});
  expect(outcome(freshPreservation(),true,0)).toMatchObject({city:'destroyed',individual:'lost'});
});

import {GameClock} from '../src/game/clock';
import {emptyArchive,validateArchive,type Checkpoint} from '../src/storage/archive';

it('labels a checkpoint with the tick already applied by its update',()=>{
  const clock=new GameClock();clock.clear('loading');clock.clear('pointerUnlocked');
  let checkpointTick=0;
  clock.advance(1/60,()=>{checkpointTick=clock.tick;clock.pause('menu');});
  expect(checkpointTick).toBe(1);expect(clock.tick).toBe(1);
});

it('validates checkpoint motion and rejects incomplete or forged nested state',()=>{
  const archive=emptyArchive();
  const checkpoint:Checkpoint={...initialEnvironment(scenario),scenarioId:scenario.id,scenarioVersion:1,integratorVersion:'verlet-1',tick:0,position:[0,.9,64],yaw:0,pitch:0,preservation:freshPreservation(),ended:false,outcome:null,motion:{verticalSpeed:0,grounded:false,safePosition:[0,.9,64]},npcs:Array.from({length:6},()=>({position:[0,0,0],yaw:0,state:'idle',waypoint:0}))};
  archive.checkpoint=checkpoint;expect(validateArchive(archive)).toEqual(archive);
  for(const mutate of [
    (c:Checkpoint)=>{c.preservation.integrity=2;},
    (c:Checkpoint)=>{c.npcs![0].waypoint=99;},
    (c:Checkpoint)=>{c.celestial.stars[1].id='s1';},
    (c:Checkpoint)=>{c.celestialAccumulator=.003;},
    (c:Checkpoint)=>{c.ended=true;},
  ]){const invalid=structuredClone(archive);mutate(invalid.checkpoint!);expect(()=>validateArchive(invalid)).toThrow();}
});
