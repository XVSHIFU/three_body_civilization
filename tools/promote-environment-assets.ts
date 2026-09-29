import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectGlb,assertAssetBudget} from './glb-budget';
const ids=['ground_slab','ground_band','ground_platform','wall_corner','railing','stone_cluster','supply_crate','route_flag'];
const manifest=JSON.parse(readFileSync('content/assets/manifest.json','utf8'));
const points=JSON.parse(readFileSync('content/assets/interaction-points.json','utf8'));
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const prepared=ids.map(id=>{
 const source=`assets/source/environment/${id}.bbmodel`,sourceBytes=readFileSync(source);
 const design=JSON.parse(readFileSync(`assets/source/environment/${id}.design.json`,'utf8'));
 const reportPath=`reports/blockbench/${id}-source-roundtrip.json`,report=JSON.parse(readFileSync(reportPath,'utf8')),native=`reports/blockbench/${id}-native.glb`,bytes=readFileSync(native);
 if(!report.passed||report.sourceSha256!==sha(sourceBytes)||report.nativeSha256!==sha(bytes))throw Error(`Stale native export ${id}`);
 const actual=inspectGlb(bytes);assertAssetBudget(id,actual,design);
 const entry={id,path:`assets/models/${id}.glb`,version:1,type:'static',size:design.size,coordinateSystem:'Y-up, metres, ground-centred',materials:actual.materials,triangles:actual.triangles,animations:[],collider:`content/colliders/${id}.json`,source,author:design.author,license:design.license,bytes:bytes.length,sha256:sha(bytes),interactionPoints:[],export:{kind:'blockbench-native',report:reportPath,sourceSha256:sha(sourceBytes)}};
 const boxes=design.colliders;
 if(!Array.isArray(boxes)||!boxes.length||boxes.some((box:{position:number[];halfExtents:number[]})=>box.position.length!==3||box.halfExtents.length!==3||!box.position.every(Number.isFinite)||!box.halfExtents.every(v=>Number.isFinite(v)&&v>0)))throw Error(`Invalid collider ${id}`);
 return {id,entry,native,collider:{id,boxes}};
});
// Complete provenance validation before touching any production file.
for(const {id,entry,native,collider} of prepared){copyFileSync(native,`public/${entry.path}`);writeFileSync(entry.collider,JSON.stringify(collider,null,2)+'\n');writeFileSync(`content/assets/${id}.json`,JSON.stringify(entry,null,2)+'\n');const index=manifest.findIndex((e:{id:string})=>e.id===id);if(index<0)manifest.push(entry);else manifest[index]=entry;points[id]=[];}
writeFileSync('content/assets/manifest.json',JSON.stringify(manifest,null,2)+'\n');writeFileSync('content/assets/interaction-points.json',JSON.stringify(points,null,2)+'\n');
let licenses=readFileSync('licenses/assets.csv','utf8').trimEnd();for(const {id,entry} of prepared)if(!licenses.split(/\r?\n/).some(line=>line.startsWith(`${id},`)))licenses+=`\n${id},${entry.author},${entry.license},${entry.source}`;writeFileSync('licenses/assets.csv',licenses+'\n');
console.log('Eight verified native environment assets promoted.');
