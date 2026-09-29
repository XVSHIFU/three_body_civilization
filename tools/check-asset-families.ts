import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assetIds} from '../src/renderer/assets';
import {npcAppearances} from '../src/renderer/npc-appearance';
import {inspectGlb} from './glb-budget';

const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const manifest=read('content/assets/manifest.json') as {id:string;source:string;path:string;collider:string;author:string;license:string;sha256:string;triangles:number}[];
const licenseRows=readFileSync('licenses/assets.csv','utf8').trim().split(/\r?\n/).slice(1);
const field=(value:string)=>/[",\r\n]/.test(value)?`"${value.replaceAll('"','""')}"`:value;
function license(id:string,source:string,author:string,license:string){
 const expected=[id,author,license,source].map(field).join(',');
 if(licenseRows.filter(row=>row===expected).length!==1)throw Error(`Missing or mismatched license record: ${id}`);
}
function production(id:string){
 const asset=manifest.find(a=>a.id===id);if(!asset)throw Error(`Required production asset missing: ${id}`);
 if(!assetIds.some(value=>value===id))throw Error(`Required production asset is not loaded: ${id}`);
 if(sha(`public/${asset.path}`)!==asset.sha256)throw Error(`Production asset changed: ${id}`);
 const actual=inspectGlb(readFileSync(`public/${asset.path}`));
 if(actual.triangles!==asset.triangles)throw Error(`Stale triangle count: ${id}`);
 const collider=read(asset.collider);if(collider.id!==id)throw Error(`Collider identity differs: ${id}`);
 license(id,asset.source,asset.author,asset.license);
 return {id,source:asset.source,sourceSha256:sha(asset.source),glb:`public/${asset.path}`,sha256:asset.sha256,collider:asset.collider,triangles:actual.triangles};
}
const families:{name:string;budget:number;members:ReturnType<typeof production>[]}[]=[];
function family(name:string,budget:number,ids:string[]){
 const members=ids.map(production);if(members.some(m=>m.triangles>budget))throw Error(`Family budget exceeded: ${name}`);
 families.push({name,budget,members});
}
family('地面板／台地',200,['ground_slab','ground_band','ground_platform']);
family('墙／角墙／门洞',500,['wall','wall_corner','doorway']);
family('台阶／栏杆',600,['stairs','railing']);
family('房屋外壳',1500,['house_terrace','house_tower']);
family('观象柱／温度仪',1000,['observatory_pillar','thermometer']);
family('保存设施／档案台',3000,['facility','archive_desk']);
family('人物基础体',1200,['npc']);
family('石块／木箱／旗帜',250,['stone_cluster','supply_crate','route_flag']);
family('毁灭后轮廓',1500,['house_terrace_ruined','house_tower_ruined']);
const ruler=production('ruler_cube');
const covered=new Set([ruler.id,...families.flatMap(f=>f.members.map(m=>m.id))]);
if(manifest.length!==covered.size||assetIds.length!==covered.size||manifest.some(a=>!covered.has(a.id)))throw Error('Production inventory and plan coverage differ');

const author='Project original geometry',rights='Project original; public release decision pending';
const assemblyId='observatory_assembly',assemblySource=`assets/source/observatory/${assemblyId}.bbmodel`,assemblyGlb=`reports/blockbench/${assemblyId}-native.glb`;
const assembly=read(`reports/blockbench/${assemblyId}-source-roundtrip.json`),assemblyBudget=inspectGlb(readFileSync(assemblyGlb)),runtimeAssembly=read('reports/observatory-assembly.json');
if(!assembly.passed||assembly.sourceSha256!==sha(assemblySource)||assembly.nativeSha256!==sha(assemblyGlb)||assembly.triangles!==assemblyBudget.triangles||assemblyBudget.triangles!==runtimeAssembly.triangles||assemblyBudget.triangles>6000||assemblyBudget.materials!==1)throw Error('Observatory assembly evidence differs');
license(assemblyId,assemblySource,author,rights);
const observatory={name:'观象台',budget:6000,triangles:assemblyBudget.triangles,source:assemblySource,glb:assemblyGlb,sourceSha256:assembly.sourceSha256,nativeSha256:assembly.nativeSha256,runtime:'Shared layout with instanced modules; handoff GLB is not loaded again'};

const variants=read('reports/blockbench/npc-variants-roundtrip.json');
const base=manifest.find(a=>a.id==='npc')!;
if(!variants.passed||variants.baseSha256!==base.sha256||variants.reports.length!==6||npcAppearances.length!==6)throw Error('Six NPC appearances required');
const clothing=Array.from({length:6},(_,index)=>{
 const id=`npc_variant_${index}`,source=`assets/source/npc-variants/${id}.bbmodel`,glb=`reports/blockbench/${id}-native.glb`,report=variants.reports.find((r:{id:string})=>r.id===id),actual=inspectGlb(readFileSync(glb));
 if(!report||report.sourceSha256!==sha(source)||report.nativeSha256!==sha(glb)||report.triangles!==actual.triangles||actual.triangles-base.triangles>200||actual.triangles>1200||actual.materials!==1||actual.textures.some(t=>t.width>128||t.height>128)||report.poses<26||report.curveCount!==20)throw Error(`NPC handoff evidence differs: ${id}`);
 license(id,source,author,rights);
 return {id,name:npcAppearances[index].name,source,glb,sourceSha256:report.sourceSha256,nativeSha256:report.nativeSha256,triangles:actual.triangles,addedTriangles:actual.triangles-base.triangles};
});
const report={passed:true,scope:'Plan section 11: all 11 named families plus the unit ruler. File coverage, provenance, budget and current handoff reports only; not a visual or hardware acceptance.',productionAssets:manifest.length,familyCount:families.length+2,families,observatory,clothing:{name:'人物服装变化',addedTriangleBudget:200,variants:clothing},ruler,unverified:['5/20/50m functional recognition for all assets','moving-view texture filtering','full city disaster visuals','first-person route and performance on target hardware','public release rights confirmation']};
writeFileSync('reports/asset-family-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(`11 planned families covered; ${manifest.length} production GLBs, one observatory handoff and six NPC handoffs. Appearance and hardware acceptance remain separate.`);
