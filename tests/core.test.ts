import {describe,it,expect} from 'vitest';
import {GameClock} from '../src/game/clock';
import {step,stellarEnergy,observe,initialState,type Scenario} from '../src/simulation/core';
import {sample,addObservation,deriveKnowledge} from '../src/gameplay/evidence';
import {freshPreservation,beginPreservation,cancelPreservation,stepPreservation,outcome} from '../src/gameplay/preservation';
export const fixture:Scenario={id:'test',version:1,integratorVersion:'verlet-1',h:0.001,timeScale:0.1,stars:[{id:'s1',mass:1,luminosity:1,position:[-1,0,0],velocity:[0,0,-0.5]},{id:'s2',mass:1,luminosity:1,position:[1,0,0],velocity:[0,0,0.5]},{id:'s3',mass:0.1,luminosity:0.3,position:[0,0,10],velocity:[0.4,0,0]}],planet:{id:'p',mass:0,luminosity:0,position:[4,0,1],velocity:[0,0,0.6]},latitude:0,rotation:0,spin:0.2,climate:{base:28,gain:20,referenceFlux:0.01,tau:20,warning:39,danger:54,cityLimit:80,facilityLimit:8},duration:180};
describe('fixed clock',()=>{
 it('matches at 30, 60 and 120 Hz',()=>{for(const hz of [30,60,120]){const c=new GameClock();c.pauseReasons.clear();let distance=0;for(let i=0;i<hz*10;i++)c.advance(1/hz,dt=>distance+=dt*4.2);expect(c.tick).toBe(600);expect(distance).toBeCloseTo(42,8);}});
 it('does not resume while another reason remains or catch up hidden time',()=>{const c=new GameClock();c.clear('loading');c.pause('hidden');c.clear('pointerUnlocked');c.advance(30,()=>{throw Error('paused');});expect(c.tick).toBe(0);c.clear('hidden');c.advance(1/60,()=>{});expect(c.tick).toBe(1);});
});
describe('celestial physics',()=>{
 it('conserves closed star energy and agrees with half steps',()=>{let a=initialState(fixture),b=initialState(fixture);const e=stellarEnergy(a);for(let i=0;i<1000;i++){a=step(a,0.001);b=step(step(b,0.0005),0.0005);}expect(Math.abs((stellarEnergy(a)-e)/e)).toBeLessThan(1e-5);a.stars.forEach((v,i)=>v.position.forEach((x,j)=>expect(x).toBeCloseTo(b.stars[i].position[j],5)));});
 it('rejects close encounters',()=>{const a=initialState(fixture);a.planet.position=[...a.stars[0].position];expect(()=>step(a,.001)).toThrow('近距离');});
 it('horizon gates radiation independently of camera orientation',()=>{const s=observe(initialState(fixture),fixture);expect(s.every(b=>b.aboveHorizon===(b.direction[1]>0))).toBe(true);});
});
describe('evidence and survival',()=>{
 it('never awards unseen facts or repeats samples',()=>{const o=sample(1,10,'pillar',[{id:'s1',direction:[0,1,0],aboveHorizon:true,irradiance:1}],28);expect(o.temperature).toBeNull();expect(deriveKnowledge([o])).toEqual([]);expect(addObservation([o],o)).toHaveLength(1);expect(deriveKnowledge([{...o,sunIds:['s1','s2']}])).toHaveLength(1);});
 it('distinguishes preserved individuals from destroyed cities',()=>{let p=beginPreservation(freshPreservation());expect(cancelPreservation(p).phase).toBe('idle');for(let i=0;i<721;i++)p=stepPreservation(p,1/60,2,8);expect(outcome(p,true,1)).toMatchObject({city:'destroyed',individual:'preserved',evidenceCount:1});expect(outcome(freshPreservation(),true,1).individual).toBe('lost');p=stepPreservation(p,100,20,8);expect(outcome(p,true,1).individual).toBe('lost');});
});
