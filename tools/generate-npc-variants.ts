import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {npcVariantSource,type NpcSource} from './npc-variant-source';
import {npcAppearances} from '../src/renderer/npc-appearance';
const source=JSON.parse(readFileSync('assets/source/npc.bbmodel','utf8')) as NpcSource;
mkdirSync('assets/source/npc-variants',{recursive:true});
const outputs:{path:string;data:string}[]=[];
for(let i=0;i<npcAppearances.length;i++){
 const path=`assets/source/npc-variants/npc_variant_${i}.bbmodel`,data=JSON.stringify(npcVariantSource(source,i),null,2)+'\n';
 if(existsSync(path)&&readFileSync(path,'utf8')!==data)throw Error(`${path} has edits; refusing to overwrite. Preserve edits before regenerating.`);
 outputs.push({path,data});
}
for(const {path,data} of outputs)writeFileSync(path,data);
console.log('Six editable NPC appearance sources generated; base production source unchanged.');
