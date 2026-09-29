import {deriveKnowledge,type Observation} from './evidence';

/** Only a recorded simultaneous multi-sun observation from an earlier civilization unlocks this aid. */
export function inheritedCalibration(observations:Observation[],civilization:number):Observation|null {
 const inherited=observations.filter(o=>o.civilization<civilization);
 const proof=deriveKnowledge(inherited)[0]?.evidenceIds[0];
 return inherited.find(o=>o.id===proof)??null;
}
export function directionReadings(sample:Observation){
 if(sample.source!=='pillar')return [];
 return sample.sunIds.flatMap((id,index)=>{
  const direction=sample.directions[id];if(!direction)return [];
  const [east,up,north]=direction,length=Math.hypot(...direction);
  if(!Number.isFinite(length)||length<1e-12)return [];
  return [{label:`天体 ${index+1}`,altitude:Math.asin(Math.max(-1,Math.min(1,up/length)))*180/Math.PI,
   azimuth:Math.hypot(east,north)<1e-8?null:(Math.atan2(east,north)*180/Math.PI+360)%360}];
 });
}
