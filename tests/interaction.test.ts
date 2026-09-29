import {it,expect,vi} from 'vitest';
import {interactionBehavior,type InteractionContext,type TargetKind} from '../src/gameplay/interaction';

it('declares and dispatches every supported object action through its stable identity',()=>{
 const kinds:TargetKind[]=['plaque','pillar','thermometer','facility','archive','teacher','keeper'];
 for(const kind of kinds){
  const context:InteractionContext={ended:false,preservationPhase:'idle',dispatch:vi.fn()};
  const target=interactionBehavior(`test-${kind}`,kind,()=>true);
  expect(target.actions).toHaveLength(1);expect(target.actions[0].label.length).toBeGreaterThan(0);
  expect(target.execute(target.actions[0].id,context)).toBe(true);
  expect(context.dispatch).toHaveBeenCalledWith(`test-${kind}`,target.actions[0].id);
 }
});

it('rechecks availability at execution and never dispatches unsupported or locked actions',()=>{
 let visible=true;const target=interactionBehavior('plaque','plaque',()=>visible),dispatch=vi.fn();
 const context:InteractionContext={ended:false,preservationPhase:'idle',dispatch};
 expect(target.canInteract(context)).toBe(true);visible=false;
 expect(target.execute('read',context)).toBe(false);visible=true;
 expect(target.execute('measure',context)).toBe(false);
 expect(target.execute('read',{...context,ended:true})).toBe(false);
 expect(target.execute('read',{...context,preservationPhase:'entering'})).toBe(false);
 const facility=interactionBehavior('facility','facility',()=>true);
 expect(facility.execute('inspect-preservation',{...context,preservationPhase:'preparing'})).toBe(false);
 expect(dispatch).not.toHaveBeenCalled();
});
