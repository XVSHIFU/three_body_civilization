import type {Observation} from '../gameplay/evidence';

/** Only committed observations enter inherited guidance; no simulated future is sampled. */
export function inheritedObservations(observations:Observation[],civilization:number){
 const previous=observations.filter(o=>o.civilization<civilization&&o.source==='pillar');
 const latest=Math.max(0,...previous.map(o=>o.civilization));
 return previous.filter(o=>o.civilization===latest).sort((a,b)=>a.tick-b.tick);
}

export function evidenceSummary(observations:Observation[],civilization:number){
 const current=observations.filter(o=>o.civilization===civilization&&o.source==='pillar').sort((a,b)=>a.tick-b.tick);
 const known=new Set(observations.filter(o=>o.civilization<civilization).flatMap(o=>o.sunIds));
 const newSuns=[...new Set(current.flatMap(o=>o.sunIds))].filter(id=>!known.has(id));
 return {current,newSuns,first:current[0],last:current.at(-1)};
}
