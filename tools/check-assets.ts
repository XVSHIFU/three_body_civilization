import {inspectGlb,assertAssetBudget} from './glb-budget';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,statSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const manifest=JSON.parse(readFileSync('content/assets/manifest.json','utf8')) as {id:string;path:string;sha256:string;triangles:number;materials:number;size:number[];source:string;collider:string;license:string;interactionPoints:{id:string;purpose:string;position:number[]}[]}[];
const pointDefinitions=JSON.parse(readFileSync('content/assets/interaction-points.json','utf8'));
for(const asset of manifest){
 const provenance=(asset as typeof asset & {export?:{kind:string;sourceSha256:string;report:string}}).export;
 if(provenance){
  const report=JSON.parse(readFileSync(provenance.report,'utf8'));
  if(provenance.kind!=='blockbench-native'||!report.passed||report.nativeSha256!==asset.sha256||createHash('sha256').update(readFileSync(asset.source)).digest('hex')!==provenance.sourceSha256||report.sourceSha256!==provenance.sourceSha256)throw Error(`Native provenance differs ${asset.id}`);
 }
 const names=new Set<string>();
 if(!Array.isArray(asset.interactionPoints))throw Error(`Missing interaction points ${asset.id}`);
 for(const point of asset.interactionPoints){
  if(!point.id||!point.purpose||names.has(point.id)||point.position.length!==3||!point.position.every(Number.isFinite))throw Error(`Invalid interaction point ${asset.id}`);
  names.add(point.id);
 }
 if(JSON.stringify(asset.interactionPoints)!==JSON.stringify(pointDefinitions[asset.id]))throw Error(`Stale interaction points ${asset.id}`);
 const individual=JSON.parse(readFileSync(`content/assets/${asset.id}.json`,'utf8'));
 if(JSON.stringify(individual)!==JSON.stringify(asset))throw Error(`Individual manifest differs ${asset.id}`);
}
const ids=new Set<string>();const measured:unknown[]=[];
for(const a of manifest){if(ids.has(a.id))throw Error(`Duplicate ID ${a.id}`);ids.add(a.id);for(const path of [`public/${a.path}`,a.source,a.collider]){if(!existsSync(path))throw Error(`Missing ${path}`);let at=process.cwd();for(const segment of path.split('/')){if(!readdirSync(at).includes(segment))throw Error(`Case mismatch ${path}`);at=resolve(at,segment);}}if(!a.license||a.size.some(n=>!Number.isFinite(n)||n<=0))throw Error(`Budget invalid ${a.id}`);const data=readFileSync(`public/${a.path}`);const actual=inspectGlb(data);assertAssetBudget(a.id,actual,a);measured.push({id:a.id,...actual});if(createHash('sha256').update(data).digest('hex')!==a.sha256)throw Error(`Content hash mismatch ${a.id}`);if(data.readUInt32LE(0)!==0x46546c67||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length)throw Error(`Invalid GLB ${a.id}`);const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());if(!json.nodes?.length)throw Error(`No nodes ${a.id}`);if(a.id==='npc'&&!['idle','walk','observe','panic','preserve'].every(n=>json.animations?.some((v:{name:string})=>v.name===n)))throw Error('NPC animations missing');}
const bytes=manifest.reduce((n,a)=>n+statSync(`public/${a.path}`).size,0);mkdirSync('reports',{recursive:true});writeFileSync('reports/asset-check.json',JSON.stringify({passed:true,measured,modules:manifest.length,totalModelBytes:bytes,checks:['native production export/source provenance','finite named interaction points','individual/aggregate manifest agreement','interaction point definition agreement','unique IDs','case-sensitive paths','license fields','actual GLB triangle/material counts match manifest','per-family triangle limits','embedded PNG dimensions','GLB headers','SHA-256 content hashes','NPC clip names'],unverified:['moving-view texture filtering','runtime mesh dimensions (covered separately by asset tests)','manual appearance and collisions']},null,2));console.log(`${manifest.length} modules checked; ${bytes} total GLB bytes.`);

