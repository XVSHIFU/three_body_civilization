import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
function identity(paths:string[]){
 const files:string[]=[];
 function visit(path:string){if(statSync(path).isDirectory())for(const child of readdirSync(path).sort())visit(join(path,child));else files.push(path);}
 paths.forEach(visit);const hash=createHash('sha256');
 for(const file of [...new Set(files)].sort()){hash.update(file.replaceAll('\\','/'));hash.update('\0');hash.update(readFileSync(file));hash.update('\0');}
 return hash.digest('hex').slice(0,16);
}
export function buildIdentity(){return {
 buildId:identity(['src','content','package-lock.json']),
 runtimeId:identity(['src/game','src/gameplay','src/player','src/simulation','src/renderer/world.ts','src/renderer/buildings.ts','src/renderer/environment.ts','src/renderer/observatory-layout.ts','src/renderer/asset-points.ts','src/storage/archive.ts','src/storage/checkpoint-evidence.ts','content','package-lock.json']),
};}
