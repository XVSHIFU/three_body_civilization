import type {PreservationPhase} from './preservation';
export type TargetKind='plaque'|'pillar'|'thermometer'|'facility'|'archive'|'teacher'|'keeper';
export type ActionId='read'|'measure'|'inspect-preservation'|'open-archive'|'talk';
export interface InteractionContext {ended:boolean;preservationPhase:PreservationPhase;dispatch:(targetId:string,action:ActionId)=>void}
export interface InteractionBehavior {
 actions:ReadonlyArray<{id:ActionId;label:string}>;
 canInteract:(context:InteractionContext)=>boolean;
 execute:(action:ActionId,context:InteractionContext)=>boolean;
}
const actions:Record<TargetKind,{id:ActionId;label:string}>={
 plaque:{id:'read',label:'阅读石牌'},pillar:{id:'measure',label:'读取天空样本'},thermometer:{id:'measure',label:'读取温度'},
 facility:{id:'inspect-preservation',label:'查看保存流程'},archive:{id:'open-archive',label:'打开档案'},teacher:{id:'talk',label:'交谈'},keeper:{id:'talk',label:'交谈'},
};
export function interactionBehavior(id:string,kind:TargetKind,visible:()=>boolean):InteractionBehavior {
 const action=actions[kind];
 const canInteract=(context:InteractionContext)=>!context.ended&&visible()&&['idle','preparing'].includes(context.preservationPhase)&&(kind!=='facility'||context.preservationPhase==='idle');
 return {actions:[{...action}],canInteract,execute:(requested,context)=>{
  if(requested!==action.id||!canInteract(context))return false;
  context.dispatch(id,requested);return true;
 }};
}
