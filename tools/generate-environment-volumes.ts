import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const ids=['ground_slab','ground_band','ground_platform','wall_corner','railing','stone_cluster','supply_crate','route_flag'];
const sha=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
const volumes=ids.map(id=>{
 const sourceBytes=readFileSync(`assets/source/environment/${id}.bbmodel`),source=JSON.parse(sourceBytes.toString()),native=readFileSync(`public/assets/models/${id}.glb`),report=JSON.parse(readFileSync(`reports/blockbench/${id}-source-roundtrip.json`,'utf8'));
 if(!report.passed||sha(sourceBytes)!==report.sourceSha256||sha(native)!==report.nativeSha256)throw Error(`Unverified source/native pair ${id}`);
 if(source.outliner.some((group:any)=>group.rotation?.some((v:number)=>v!==0)||group.children.some((child:any)=>typeof child!=='string')))throw Error('Only flat unrotated source groups supported');
 const boxes=source.elements.map((cube:any)=>{
  if(cube.type!=='cube'||cube.rotation?.some((v:number)=>v!==0)||['from','to'].some(key=>cube[key]?.length!==3||cube[key].some((v:number)=>!Number.isFinite(v)))||cube.from.some((v:number,i:number)=>v>=cube.to[i])||Object.values(cube.faces).some((face:any)=>face.texture!==0))throw Error(`Not a verified opaque source cube: ${id}`);
  return {name:cube.name,min:cube.from.map((v:number)=>v/16),max:cube.to.map((v:number)=>v/16)};
 });
 return {id,sourceSha256:sha(sourceBytes),nativeSha256:sha(native),boxes};
});
mkdirSync('content/solid-volumes',{recursive:true});writeFileSync('content/solid-volumes/environment.json',JSON.stringify(volumes,null,2)+'\n');console.log(`Verified solid volumes for ${volumes.length} native modules; these are visual source cubes, not collision envelopes.`);
