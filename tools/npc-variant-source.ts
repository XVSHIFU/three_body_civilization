import {createHash} from 'node:crypto';
import {npcAppearances} from '../src/renderer/npc-appearance';
import {paletteUv} from './source-palette';
type Cube={name:string;uuid:string;from:number[];to:number[];origin:number[];faces:Record<string,{uv:number[];texture:number}>;[key:string]:unknown};
type Bone={name:string;uuid:string;origin:number[];children:string[]};
export interface NpcSource {name:string;model_identifier:string;elements:Cube[];outliner:Bone[];notes:unknown;[key:string]:unknown}
export function npcVariantSource(source:NpcSource,index:number):NpcSource{
 const look=npcAppearances[index];if(!look)throw Error('Unknown appearance');
 const result=structuredClone(source);result.name=`npc_variant_${index}`;result.model_identifier=result.name;
 result.notes={base:'npc.bbmodel',appearance:look.name,unitsPerMeter:16,scope:'Editable runtime appearance counterpart. Native export roundtrip still required before replacing production assets.'};
 const torso=result.elements.find(element=>element.name==='torso');if(!torso)throw Error('Missing torso');
 for(const face of Object.values(torso.faces))face.uv=paletteUv(look.torso,64);
 for(const accessory of look.accessories){
  const bone=result.outliner.find(group=>group.name===accessory.bone);if(!bone)throw Error('Missing accessory bone');
  const center=accessory.position.map((value,i)=>value*16+bone.origin[i]);
  const hash=createHash('sha256').update(`${source.model_identifier}/${index}/${accessory.name}`).digest('hex');
  const uuid=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  result.elements.push({name:accessory.name,uuid,type:'cube',from:center.map((v,i)=>v-accessory.size[i]*8),to:center.map((v,i)=>v+accessory.size[i]*8),origin:[...bone.origin],rotation:[0,0,0],box_uv:false,color:0,faces:Object.fromEntries(['north','south','east','west','up','down'].map(face=>[face,{uv:paletteUv(accessory.color,64),texture:0}]))});
  bone.children.push(uuid);
 }
 return result;
}
