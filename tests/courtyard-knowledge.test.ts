import {expect,it} from 'vitest';
import {CourtyardLoop} from '../src/courtyard/loop';
import {evidenceSummary,inheritedObservations} from '../src/courtyard/knowledge';

it('inherits only committed earlier observations and distinguishes new evidence from repeated readings',()=>{
 const loop=new CourtyardLoop();while(loop.tick<45*60)loop.step();loop.record(loop.observation(['s1']));
 while(loop.tick<100*60)loop.step();loop.beginPreservation([-8,.92,-10]);loop.finishPreservation();loop.resolveAftermath();
 const next=loop.nextCivilization();while(next.tick<140*60)next.step();
 expect(inheritedObservations(next.archive.observations,2).map(o=>o.sunIds)).toEqual([['s1']]);
 expect(evidenceSummary(next.archive.observations,2).newSuns).toEqual([]);
 next.record(next.observation(['s1','s2','s3']));
 expect(evidenceSummary(next.archive.observations,2).newSuns).toEqual(['s2','s3']);
 expect(inheritedObservations(next.archive.observations,2)).toHaveLength(1);
 expect(inheritedObservations(next.archive.observations,1)).toEqual([]);
});
