import 'fake-indexeddb/auto';
import {expect,it,vi} from 'vitest';
import {CourtyardLoop,CourtyardLoopStore,canRevive,recoveryProvision,validateLoopArchive} from '../src/courtyard/loop';
import {ArchiveStore,DB_NAME} from '../src/storage/archive';
import {CourtyardSession} from '../src/courtyard/session';

const advance=(loop:CourtyardLoop,seconds:number)=>{while(loop.tick<seconds*60&&loop.phase==='observing')loop.step();};
const record=(loop:CourtyardLoop)=>{const o=loop.observation(loop.sky.filter(s=>s.direction[1]>.025).map(s=>s.id));loop.record(o);return o;};
const atFacility:[number,number,number]=[-8,.92,-10];

it('derives both routes from the same world, preserves evidence, and separates dehydration from revival',()=>{
 const early=new CourtyardLoop();advance(early,60);record(early);advance(early,110);
 expect(early.beginPreservation([4,2.4,-3])).toBe(false);expect(early.beginPreservation(atFacility)).toBe(true);
 advance(early,123);expect(early.preservation.phase).toBe('preserved');expect(early.recovery).toBeNull();expect(early.phase).toBe('observing');
 advance(early,230);expect(early.tick/60).toBeCloseTo(180.7,1);expect(early.phase).toBe('aftermath');
 const r=early.resolveAftermath();expect(r.observer).toBe('same');expect(r.tick).toBeGreaterThan(515*60);expect(canRevive(r.conditions)).toBe(true);
 const resumed=new CourtyardLoop(early.snapshot());expect(resumed.resolveAftermath()).toEqual(r);
 const next=early.nextCivilization();expect(next.observerId).toBe(early.observerId);expect(next.archive.history).toHaveLength(1);expect(next.archive.observations).toEqual(early.archive.observations);
 expect(()=>early.record(early.archive.observations[0])).toThrow();
 const late=new CourtyardLoop();advance(late,60);record(late);advance(late,140);const newer=record(late);
 expect(newer.sunIds.length).toBeGreaterThan(late.archive.observations[0].sunIds.length);
 advance(late,175);late.beginPreservation(atFacility);advance(late,230);
 expect(late.tick).toBe(early.tick);expect(late.snapshot().checkpoint!.outcome!.individual).toBe('lost');expect(late.resolveAftermath().observer).toBe('successor');
 const successor=late.nextCivilization();expect(successor.observerId).toBe(2);expect(successor.archive.observations).toHaveLength(2);expect(successor.archive.history).toHaveLength(1);
 const afterReload=new CourtyardLoop(successor.snapshot());expect(afterReload.archive.history).toHaveLength(1);expect(afterReload.observerId).toBe(2);
});

it('keeps intact bodies waiting when water or assistance is absent rather than inventing resurrection or death',()=>{
 const l=new CourtyardLoop();advance(l,110);l.beginPreservation(atFacility);advance(l,230);
 const waiting=l.resolveAftermath({...recoveryProvision,waterAvailable:false});expect(waiting.observer).toBe('waiting');expect(l.phase).toBe('aftermath');expect(()=>l.nextCivilization()).toThrow();
 const restored=new CourtyardLoop(l.snapshot());expect(restored.recovery?.observer).toBe('waiting');
 expect(restored.resolveAftermath().observer).toBe('same');
 for(const field of ['bodyIntact','siteIntact','environmentSuitable','waterAvailable','assistanceAvailable'] as const){expect(canRevive({...restored.recovery!.conditions,[field]:false})).toBe(false);}
});

it('honors preparation cancellation, freezes the full simulation while reading, and restores exact progress',()=>{
 const l=new CourtyardLoop(),session=new CourtyardSession();session.ready();session.locked();l.beginPreservation(atFacility);
 for(let i=0;i<60;i++)session.clock.advance(1/60,()=>l.step());expect(l.cancelPreservation()).toBe(true);
 l.beginPreservation(atFacility);for(let i=0;i<121;i++)session.clock.advance(1/60,()=>l.step());expect(l.cancelPreservation()).toBe(false);
 const before=l.snapshot();session.open('journal');session.clock.advance(30,()=>l.step());expect(l.snapshot()).toEqual(before);
 const restored=new CourtyardLoop(before);session.locked();for(let i=0;i<90;i++){session.clock.advance(1/60,()=>l.step());restored.step();}expect(restored.snapshot()).toEqual(l.snapshot());
});

it('records only supplied visible facts and rejects incompatible or contradictory recovery checkpoints',()=>{
 const l=new CourtyardLoop();advance(l,140);const ids=l.sky.filter(s=>s.direction[1]>.025).map(s=>s.id);
 const o=l.observation(ids.slice(0,1));expect(o.sunIds).toHaveLength(1);expect(o.temperature).toBeNull();l.record(o);l.record(o);expect(l.archive.observations).toHaveLength(1);
 expect(()=>l.observation(['invented'])).toThrow();expect(()=>l.record({...o,temperature:99})).toThrow();
 const bad=l.snapshot();bad.checkpoint!.runtimeId='prototype';expect(()=>validateLoopArchive(bad)).toThrow('不兼容');
});

it('atomically saves observations and checkpoints, retains prototype saves, and refuses a stale tab',async()=>{
 const original=new ArchiveStore(DB_NAME);await original.open();const originalBefore=await original.read();
 const name='test-courtyard-loop-'+crypto.randomUUID(),a=new CourtyardLoopStore(name),b=new CourtyardLoopStore(name);
 const loop=await a.open(),stale=await b.open();advance(loop,60);record(loop);await a.save(loop);
 const read=new CourtyardLoopStore(name),loaded=await read.open();expect(loaded.tick).toBe(loop.tick);expect(loaded.archive.observations).toEqual(loop.archive.observations);
 await expect(b.save(stale)).rejects.toThrow('另一个标签页');
 const again=await read.open();expect(again.archive.observations).toEqual(loop.archive.observations);expect(await original.read()).toEqual(originalBefore);
 a.close();b.close();read.close();original.close();
});


it('keeps a failed transaction recoverable without duplicating records or outcomes',async()=>{
 const name='test-courtyard-failure-'+crypto.randomUUID(),store=new CourtyardLoopStore(name),loop=await store.open();advance(loop,60);record(loop);await store.save(loop);
 advance(loop,140);record(loop);const before=loop.snapshot();
 const fail=vi.spyOn(ArchiveStore.prototype,'save').mockRejectedValueOnce(Error('synthetic storage failure'));
 try{await expect(store.save(loop)).rejects.toThrow('synthetic storage failure');}finally{fail.mockRestore();}
 expect(loop.snapshot()).toEqual(before);
 const reader=new CourtyardLoopStore(name),lastGood=await reader.open();expect(lastGood.archive.observations).toHaveLength(1);
 await store.save(loop);reader.close();const recovered=await reader.open();expect(recovered.archive.observations).toHaveLength(2);expect(recovered.tick).toBe(loop.tick);
 store.close();reader.close();
});
