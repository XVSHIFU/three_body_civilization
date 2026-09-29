import type { SunView } from '../simulation/core';
export interface ObservationLocation {instrumentId:string;instrumentName:string;name:string;position:[number,number,number]}
export interface Observation { id:string; civilization:number; tick:number; source:'pillar'|'thermometer'; sunIds:string[]; directions:Record<string,[number,number,number]>; temperature:number|null;location?:ObservationLocation }
/** Local landmarks follow the authored map footprint; stored samples keep their original label. */
export function locationName({x,z}:{x:number;z:number}):string {
 const within=(left:number,right:number,back:number,front:number)=>x>=left&&x<=right&&z>=back&&z<=front;
 if(within(-30.5,-21.5,-14.5,-5.5))return '档案馆';
 if(within(-30.5,-17.5,-35.5,-24.5))return '保存设施';
 if(within(-30.5,-17.5,-24.5,-20))return '保存设施入口';
 if(within(16,32,-40,-6))return '观象台';
 if(within(-9,16,-35.5,-32.5))return '西侧撤离阶梯';
 if(within(-13,-5,-11,-3))return '广场观测区';
 if(within(-14,14,24,79))return '南侧城门';
 return '荒原广场';
}
export function observationId(civilization:number,tick:number,source:Observation['source'],location?:ObservationLocation):string {return `c${civilization}-${source}-${Math.floor(tick/600)}${location?`-${location.instrumentId}`:''}`;}
export interface Knowledge { id:'multiple-suns'; civilization:number; evidenceIds:string[] }
export type HypothesisAction='proposed'|'used'|'refuted'|'revised'|'withdrawn';
export interface HypothesisRevision {revision:number;action:HypothesisAction;civilization:number;evidenceIds:string[];note:string}
export interface Hypothesis { proposed:boolean; evidenceIds:string[]; status:'tentative'|'refuted';history?:HypothesisRevision[] }
/** Pass ONLY locally visible bodies; occlusion is resolved by the runtime. */
export function sample(civilization:number,tick:number,source:Observation['source'],visible:SunView[],temperature:number,location?:ObservationLocation):Observation {
  return {id:observationId(civilization,tick,source,location),civilization,tick,source,sunIds:source==='pillar'?visible.map(s=>s.id):[],directions:source==='pillar'?Object.fromEntries(visible.map(s=>[s.id,[...s.direction] as [number,number,number]])): {},temperature:source==='thermometer'?Math.round(temperature*10)/10:null,...(location?{location:structuredClone(location)}:{})};
}
export function addObservation(observations:Observation[],observation:Observation):Observation[]{return observations.some(o=>o.id===observation.id)?observations:[...observations,observation];}
export function deriveKnowledge(observations:Observation[]):Knowledge[]{
  // A simultaneous sample with two resolved bodies is evidence of distinct suns.
  const proof=observations.find(o=>o.source==='pillar'&&new Set(o.sunIds).size>=2);
  return proof?[{id:'multiple-suns',civilization:proof.civilization,evidenceIds:[proof.id]}]:[];
}
export function proposeHypothesis(observations:Observation[]):Hypothesis {return {proposed:true,evidenceIds:observations.map(o=>o.id),status:'tentative'};}

/** These are the player's judgments, never conclusions inferred from sun count. */
export function reviseHypothesis(current:Hypothesis,action:HypothesisAction,evidence:Observation[],civilization:number,note:string):Hypothesis {
 const history=current.history??[],reason=note.trim();
 if(history.length>=1000)throw Error('假设历史已达上限，请先导出档案。');
 if(!evidence.length)throw Error('请先选中一条已记录事实。');
 if(reason.length>500)throw Error('判断说明请保持在 500 字以内。');
 if(['used','refuted','revised'].includes(action)&&!reason)throw Error('请说明你如何使用或修订这条判断。');
 if(action==='proposed'&&current.proposed)throw Error('该假设已经提出。');
 if(action!=='proposed'&&!current.proposed)throw Error('请先提出假设。');
 if(['used','refuted'].includes(action)&&current.status!=='tentative')throw Error('被反证的假设需先修订。');
 if(action==='revised'&&current.status!=='refuted')throw Error('当前假设仍为暂定。');
 const evidenceIds=[...new Set(evidence.map(item=>item.id))];
 const entry:HypothesisRevision={revision:history.length+1,action,civilization,evidenceIds,note:reason};
 return {proposed:action!=='withdrawn',status:action==='refuted'?'refuted':action==='withdrawn'?current.status:'tentative',evidenceIds,history:[...history,entry]};
}
