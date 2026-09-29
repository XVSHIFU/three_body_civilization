import {expect,it} from 'vitest';
import {ShadowSelector} from '../src/renderer/shadow';
import {projectGnomon} from '../src/renderer/instrument-shadows';
it('renders the initial paused checkpoint shadow without advancing simulation time',()=>{
 const selector=new ShadowSelector();
 expect(selector.update([.2,.8,0],0)).toEqual({source:1,strength:1});
 for(let i=0;i<10;i++)expect(selector.update([.2,.8,0],0)).toEqual({source:1,strength:1});
 expect(new ShadowSelector().update([0,0,0],0)).toEqual({source:-1,strength:0});
});
it('projects opposite the sun, clips to the instrument and rejects hidden suns',()=>{
 expect(projectGnomon([1,1,0],1,[-2,2,-2,2])).toEqual([-1,-0]);
 expect(projectGnomon([0,.1,-1],1,[-2,2,-2,2])).toEqual([-0,2]);
 expect(projectGnomon([1,-1,0],1,[-2,2,-2,2])).toBeNull();
});
it('retains near-equal sources and switches only after the old shadow fades out',()=>{
 const selector=new ShadowSelector();selector.update([1,.99,0],.4);
 expect(selector.source).toBe(0);expect(selector.strength).toBe(1);
 for(let i=0;i<100;i++)selector.update([1,i%2?1.1:.99,0],1/60);
 expect(selector.source).toBe(0);
 selector.update([1,2,0],.2);expect(selector.source).toBe(0);expect(selector.strength).toBe(.5);
 selector.update([1,2,0],.2);expect(selector.source).toBe(1);expect(selector.strength).toBe(0);
 selector.update([1,2,0],.4);expect(selector.strength).toBe(1);
 selector.update([0,0,0],.4);expect(selector.source).toBe(-1);expect(selector.strength).toBe(0);
});
