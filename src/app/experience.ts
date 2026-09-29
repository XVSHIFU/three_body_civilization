import {scenario,compressedScenario} from '../simulation/scenario';

export function selectExperience(search:string){
 const compressed=new URLSearchParams(search).get('experience')==='compressed';
 return {compressed,scenario:compressed?compressedScenario:scenario,
  archiveSuffix:compressed?':compressed':'',
  label:compressed?'三分钟演示':'完整体验',
  alternateLabel:compressed?'进入完整体验':'进入三分钟演示',
  alternateHref:compressed?'?experience=full':'?experience=compressed'};
}
