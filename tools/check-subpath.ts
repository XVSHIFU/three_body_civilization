import {build,preview} from 'vite';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,relative,resolve,sep} from 'node:path';
import manifest from '../content/assets/manifest.json';

const base='/three-body-civilization/';
const outDir='.validation/subpath';
const allowedRoot=resolve('.validation');
if(!resolve(outDir).startsWith(allowedRoot+sep))throw Error('Validation output escaped its workspace directory');
await build({base,build:{outDir,emptyOutDir:true},logLevel:'warn'});
const server=await preview({base,build:{outDir},preview:{host:'127.0.0.1',port:0,strictPort:false},logLevel:'warn'});
const address=server.httpServer.address();
if(!address||typeof address==='string')throw Error('Preview address unavailable');
const origin=`http://127.0.0.1:${address.port}`;
const results:{path:string;bytes:number;status:number}[]=[];
try{
 async function files(directory:string):Promise<string[]>{
  const entries=await readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(e=>e.isDirectory()?files(join(directory,e.name)):Promise.resolve([join(directory,e.name)])))).flat();
 }
 for(const file of await files(outDir)){
  const path=relative(outDir,file).replaceAll('\\','/');
  const response=await fetch(origin+base+path),bytes=Buffer.from(await response.arrayBuffer());
  if(response.status!==200||!bytes.equals(await readFile(file)))throw Error(`Subpath response mismatch: ${path}`);
  results.push({path,bytes:bytes.length,status:response.status});
 }
 const html=await (await fetch(origin+base)).text();
 for(const asset of manifest){
  const response=await fetch(`${origin}${base}${asset.path}?v=${asset.sha256}`);
  if(!response.ok||!Buffer.from(await response.arrayBuffer()).equals(await readFile(join(outDir,asset.path))))throw Error(`Versioned model URL failed: ${asset.id}`);
 }
 const references=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
 if(!references.length||references.some(ref=>!ref.startsWith(base)))throw Error('Entry references escape repository base');
 for(const reference of references){if(!(await fetch(origin+reference)).ok)throw Error(`Entry reference failed: ${reference}`);}
 const cssReferences:string[]=[];
 for(const file of results.filter(file=>file.path.endsWith('.css'))){
  const css=await readFile(join(outDir,file.path),'utf8');
  for(const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)){
   if(match[1].startsWith('data:'))continue;
   const url=new URL(match[1],origin+base+file.path);
   if(url.origin!==origin||!url.pathname.startsWith(base))throw Error(`CSS reference escapes repository base: ${url}`);
   const response=await fetch(url);
   const expected=await readFile(join(outDir,decodeURIComponent(url.pathname.slice(base.length))));
   if(!response.ok||!Buffer.from(await response.arrayBuffer()).equals(expected))throw Error(`CSS resource mismatch: ${url}`);
   cssReferences.push(url.pathname);
  }
 }
 await mkdir('reports',{recursive:true});
 await writeFile('reports/subpath-check.json',JSON.stringify({base,passed:true,scope:'HTTP byte equality for every built resource, CSS URL references and HTML entry references; not browser execution or deployment.',cssReferences,files:results},null,2));
 console.log(`Verified ${results.length} resources under ${base}`);
}finally{await new Promise<void>((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));}
