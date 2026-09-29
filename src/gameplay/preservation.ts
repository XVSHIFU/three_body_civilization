export type PreservationPhase='idle'|'preparing'|'entering'|'sealing'|'dehydrating'|'preserved'|'failed';
export interface Preservation {phase:PreservationPhase; elapsed:number; integrity:number }
export const freshPreservation=():Preservation=>({phase:'idle',elapsed:0,integrity:1});
export function beginPreservation(p:Preservation):Preservation {return p.phase==='idle'?{...p,phase:'preparing',elapsed:0}:p;}
export function cancelPreservation(p:Preservation):Preservation {return p.phase==='preparing'?freshPreservation():p;}
export function stepPreservation(p:Preservation,dt:number,heatLoad:number,limit:number):Preservation {
  if(p.phase==='failed'||p.phase==='idle')return p;
  const integrity=Math.max(0,p.integrity-Math.max(0,heatLoad-limit)*dt/80);
  if(integrity<=0)return {...p,integrity,phase:'failed'};
  if(p.phase==='preserved')return {...p,integrity};
  const elapsed=p.elapsed+dt;
  const phase:PreservationPhase=elapsed<2?'preparing':elapsed<5?'entering':elapsed<8?'sealing':elapsed<12?'dehydrating':'preserved';
  return {phase,elapsed,integrity};
}
export interface Outcome {city:'destroyed'|'standing'; individual:'preserved'|'lost'; reason:string; evidenceCount:number}
export function outcome(p:Preservation,destroyed:boolean,count:number):Outcome{return {city:destroyed?'destroyed':'standing',individual:p.phase==='preserved'&&p.integrity>0?'preserved':'lost',reason:p.phase==='preserved'&&p.integrity>0?'保存流程完成，设施仍有保护能力。':'灾变抵达时未完成有效保存。',evidenceCount:count};}
