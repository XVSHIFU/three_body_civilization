import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectGlb,assertAssetBudget} from './glb-budget';

const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const manifest=JSON.parse(readFileSync('content/assets/manifest.json','utf8'));
// Validate every source/export/report before replacing any production file.
const candidates=manifest.filter((entry:any)=>entry.export?.vertexBaseline||!entry.export).map((entry:any)=>{
 const reportPath=`reports/blockbench/${entry.id}-palette-roundtrip.json`,report=JSON.parse(readFileSync(reportPath,'utf8'));
 const native=`reports/blockbench/${entry.id}-native-palette.glb`,baseline=`reports/vertex-assets/${entry.id}.glb`,current=`public/${entry.path}`;
 if(!report.passed||hash(native)!==report.nativeSha256||hash(entry.source)!==report.sourceSha256)throw Error(`Stale native evidence: ${entry.id}`);
 const currentHash=hash(current);
 if(currentHash!==report.runtimeSha256&&currentHash!==report.nativeSha256)throw Error(`Unaccounted production edits: ${entry.id}`);
 if(existsSync(baseline)?hash(baseline)!==report.runtimeSha256:currentHash!==report.runtimeSha256)throw Error(`Missing or changed vertex baseline: ${entry.id}`);
 assertAssetBudget(entry.id,inspectGlb(readFileSync(native)),entry);
 return {entry,reportPath,report,native,baseline,current};
});
mkdirSync('reports/vertex-assets',{recursive:true});
for(const {entry,reportPath,report,native,baseline,current} of candidates){
 if(!existsSync(baseline))copyFileSync(current,baseline);
 copyFileSync(native,current);
 entry.version=2;entry.sha256=report.nativeSha256;entry.bytes=readFileSync(current).length;
 entry.export={kind:'blockbench-native',report:reportPath,sourceSha256:report.sourceSha256,vertexBaseline:baseline};
 writeFileSync(`content/assets/${entry.id}.json`,JSON.stringify(entry,null,2));
}
writeFileSync('content/assets/manifest.json',JSON.stringify(manifest,null,2));
console.log(`Promoted ${candidates.length} verified native GLBs; vertex baselines retained.`);
