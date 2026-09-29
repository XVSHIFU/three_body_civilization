import {preview} from 'vite';
import {existsSync} from 'node:fs';
// Isolated localhost origin; never changes browser permissions or the user's save.
// An actual response CSP blocks WebAssembly compilation, not a mocked error event.
const marker='.validation/wasm-block.enabled';
const server=await preview({plugins:[{name:'wasm-failure-validation',configurePreviewServer(server){server.middlewares.use((_req,res,next)=>{
 if(existsSync(marker))res.setHeader('Content-Security-Policy',"script-src 'self'; object-src 'none'; base-uri 'self'");
 res.setHeader('Cache-Control','no-store');next();
});}}],preview:{host:'127.0.0.1',port:4191,strictPort:true}});
server.printUrls();console.log(`WASM blocked while ${marker} exists. After changing it, open index.html with a fresh validation query; an ordinary 304 reload can retain the prior CSP.`);
