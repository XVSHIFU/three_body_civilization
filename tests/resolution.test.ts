import {expect,it} from 'vitest';
import {AdaptiveResolution,renderRatio} from '../src/renderer/resolution';

it('requires sustained pressure and five active seconds between downshifts',()=>{
 const policy=new AdaptiveResolution('standard');
 policy.sample(4000);expect(policy.scale).toBe(1);
 for(let i=0;i<120;i++)policy.sample(1000/60);
 expect(policy.scale).toBe(1);
 for(let i=0;i<600;i++)policy.sample(40);
 expect(policy.scale).toBe(.55);
 expect(policy.changes).toHaveLength(3);
 expect(policy.changes[0].activeSeconds).toBeGreaterThanOrEqual(5);
 for(let i=1;i<policy.changes.length;i++)expect(policy.changes[i].activeSeconds-policy.changes[i-1].activeSeconds).toBeGreaterThanOrEqual(5);
});

it('recovers only after thirty continuously stable active seconds',()=>{
 const policy=new AdaptiveResolution('standard');
 while(policy.scale===1)policy.sample(40);
 for(let i=0;i<29*60;i++)policy.sample(1000/60);
 expect(policy.scale).toBe(.85);
 policy.interrupt();
 for(let i=0;i<29*60;i++)policy.sample(1000/60);
 expect(policy.scale).toBe(.85);
 for(let i=0;i<3*60;i++)policy.sample(1000/60);
 expect(policy.scale).toBe(1);expect(policy.changes.at(-1)?.reason).toBe('stable');
});

it('uses the compatibility budget and never exceeds screen DPR or pixel limits',()=>{
 const low=new AdaptiveResolution('low');for(let i=0;i<900;i++)low.sample(1000/30);
 expect(low.scale).toBe(1);
 for(const quality of ['low','standard','high'] as const){
  const base=renderRatio(3840,2160,2,quality);
  expect(base).toBeLessThan(1);expect(renderRatio(1280,720,.75,quality)).toBeLessThanOrEqual(.75);
  expect(renderRatio(3840,2160,2,quality,.7)).toBeCloseTo(base*.7);
 }
});
