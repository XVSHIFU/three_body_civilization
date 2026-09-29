import {randomUUID} from 'node:crypto';
export const npcMotionSpecs=[['idle',.025,2],['walk',.5,1],['observe',-.7,2],['panic',.8,.65],['preserve',-.9,1.2]] as const;
export function nativeAnimations(groups:{name:string;uuid:string}[]){
 return npcMotionSpecs.map(([name,amplitude,length])=>({
  uuid:randomUUID(),name,length,loop:name==='preserve'?'hold':'loop',override:false,snapping:30,
  animators:Object.fromEntries(['arm_l','arm_r','leg_l','leg_r'].map(bone=>{
   const group=groups.find(g=>g.name===bone);if(!group)throw Error(`Missing source bone ${bone}`);
   const angle=amplitude*(bone.endsWith('l')?1:-1),values=name==='observe'||name==='preserve'?[0,angle,angle]:[angle,-angle,angle];
   return [group.uuid,{name:bone,type:'bone',keyframes:values.map((value,i)=>({uuid:randomUUID(),channel:'rotation',time:i*length/2,interpolation:'linear',data_points:[{x:String(-value*180/Math.PI),y:'0',z:'0'}]}))}];
  })),
 }));
}
