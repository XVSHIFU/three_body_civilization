import {expect,it} from 'vitest';
import {CourtyardLoop} from '../src/courtyard/loop';
import {questStep,questWaypoint} from '../src/courtyard/quest';
it('guides the commission from committed facts without revealing future sky or blocking preservation',()=>{
 const loop=new CourtyardLoop(),step=()=>questStep(loop.quest,loop.archive.observations,false,false);
 expect(step().id).toBe('meet');loop.quest.accepted=true;expect(step().id).toBe('first');
 while(loop.tick<45*60)loop.step();loop.record(loop.observation(['s1']));expect(step().id).toBe('report');
 loop.quest.briefed=true;expect(step().id).toBe('compare');
 const restored=new CourtyardLoop(loop.snapshot());expect(restored.quest).toEqual(loop.quest);
 while(loop.tick<140*60)loop.step();loop.record(loop.observation(['s1','s2','s3']));expect(step().id).toBe('evidence');
 expect(questStep({accepted:false,briefed:false},[],true,false).target).toBe('facility');
 expect(questStep(loop.quest,loop.archive.observations,true,true).target).toBeNull();
 expect(loop.beginPreservation([-8,.92,-10])).toBe(true);
});
it('accepts old checkpoints and routes the shelter marker through the gate',()=>{
 const archive=new CourtyardLoop().snapshot();delete (archive.checkpoint as any).courtyard.quest;
 expect(new CourtyardLoop(archive).quest).toEqual({accepted:false,briefed:false});
 expect(questWaypoint('facility',4,-3)?.label).toBe('沿石阶下行');
 expect(questWaypoint('facility',-3,3)?.position[0]).toBe(-8);
 expect(questWaypoint('facility',-8,-7)?.label).toBe('保存点操作桌');
});

it('rejects malformed quest metadata while leaving the supplied archive untouched',()=>{
 const archive=new CourtyardLoop().snapshot();(archive.checkpoint as any).courtyard.quest={accepted:false,briefed:true};
 expect(()=>new CourtyardLoop(archive)).toThrow('委托进度无效');expect((archive.checkpoint as any).courtyard.quest.accepted).toBe(false);
 (archive.checkpoint as any).courtyard.quest=null;expect(()=>new CourtyardLoop(archive)).toThrow('委托进度无效');
});
