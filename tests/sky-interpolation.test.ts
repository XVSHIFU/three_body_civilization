import {it,expect} from 'vitest';
import {environmentSky,interpolateSky} from '../src/simulation/sky';
import {initialState,observe,step,type SunView} from '../src/simulation/core';
import {scenario,compressedScenario} from '../src/simulation/scenario';
import {advanceEnvironment,initialEnvironment} from '../src/simulation/environment';
import {GameClock} from '../src/game/clock';

it('moves continuously inside an integration interval and matches both exact endpoints without mutating state',()=>{
 const state=initialState(scenario),original=structuredClone(state),start=environmentSky(state,0,scenario);
 const middle=environmentSky(state,scenario.h/2,scenario),end=environmentSky(state,scenario.h-1e-10,scenario),next=observe(step(state,scenario.h),scenario);
 expect(state).toEqual(original);expect(middle[0].direction).not.toEqual(start[0].direction);
 end.forEach((sun,i)=>sun.direction.forEach((n,j)=>expect(n).toBeCloseTo(next[i].direction[j],8)));
 expect(()=>environmentSky(state,scenario.h,scenario)).toThrow();
});

it('interpolates each source and rechecks the horizon rather than mixing sunlight identities',()=>{
 const previous:SunView[]=[{id:'s1',direction:[1,-.1,0],aboveHorizon:false,irradiance:1},{id:'s2',direction:[0,1,0],aboveHorizon:true,irradiance:2}];
 const current:SunView[]=[{...previous[0],direction:[1,.1,0],aboveHorizon:true,irradiance:3},previous[1]];
 const rendered=interpolateSky(previous,current,.75);
 expect(rendered.map(s=>s.id)).toEqual(['s1','s2']);expect(rendered[0].aboveHorizon).toBe(true);
 expect(Math.hypot(...rendered[0].direction)).toBeCloseTo(1);expect(rendered[0].irradiance).toBe(2.5);
 expect(previous[0].direction).toEqual([1,-.1,0]);expect(rendered[1].direction).toEqual([0,1,0]);
});

it('keeps simulation, temperature and sky identical at 30, 60 and 144 Hz; pausing adds no world time',()=>{
 const runs=[30,60,144].map(rate=>{
  const clock=new GameClock();clock.clear('loading');clock.clear('pointerUnlocked');
  let environment=initialEnvironment(compressedScenario),previous=environmentSky(environment.celestial,0,compressedScenario),current=previous;
  for(let frame=0;frame<rate*10;frame++)clock.advance(1/rate,dt=>{
   environment=advanceEnvironment(environment,dt,compressedScenario);previous=current;
   current=environmentSky(environment.celestial,environment.celestialAccumulator,compressedScenario);
  });
  const rendered=interpolateSky(previous,current,clock.interpolationAlpha);
  clock.pause('hidden');clock.advance(300,()=>{throw Error('paused simulation advanced');});
  expect(interpolateSky(previous,current,clock.interpolationAlpha)).toEqual(interpolateSky(current,current,1));
  return {environment,rendered,tick:clock.tick};
 });
 runs.forEach(run=>{expect(run.tick).toBe(600);expect(run.environment).toEqual(runs[0].environment);run.rendered.forEach((sun,i)=>sun.direction.forEach((n,j)=>expect(n).toBeCloseTo(runs[0].rendered[i].direction[j],10)));});
});
