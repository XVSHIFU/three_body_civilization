import type {Observation} from '../gameplay/evidence';
export const time=(tick:number)=>`${Math.floor(tick/3600).toString().padStart(2,'0')}:${Math.floor(tick/60)%60<10?'0':''}${Math.floor(tick/60)%60}`;
export function describe(o:Observation){return o.source==='thermometer'?`${o.temperature?.toFixed(1)} °C`:`同时观测到 ${o.sunIds.length} 颗可辨认天体`;}
