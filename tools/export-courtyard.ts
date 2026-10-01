import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';

// Uses the project's browser runtime to export standard glTF materials and embedded images.
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'error'});
await server.listen();const address=server.httpServer!.address();
if(!address||typeof address==='string')throw Error('No local export server');
const browser=process.env.COURTYARD_CDP?await chromium.connectOverCDP(process.env.COURTYARD_CDP):await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.route('**/export-host',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local asset export</title>'}));await page.goto(`http://127.0.0.1:${address.port}/export-host`);
 const assets=await page.evaluate(async()=>{
  // Vite resolves the editable TypeScript source inside the browser.
  const source='/src/courtyard/export.ts';const module=await import(/* @vite-ignore */ source);
  return module.exportCourtyardAssets() as Promise<Record<string,string>>;
 });
 await mkdir('public/assets/courtyard',{recursive:true});
 for(const [name,data] of Object.entries(assets))await writeFile(`public/assets/courtyard/${name}.glb`,Buffer.from(data,'base64'));
 console.log('Exported armillary.glb, observer.glb and shelter.glb from editable recipes; visual acceptance remains separate.');
 await page.close();
}finally{await browser.close();await server.close();}
