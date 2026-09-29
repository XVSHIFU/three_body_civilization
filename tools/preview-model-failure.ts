import {preview} from 'vite';
import {existsSync} from 'node:fs';

// Isolated test origin: inject an actual HTTP failure without changing production assets.
const marker='.validation/model-block.enabled';
const server=await preview({plugins:[{name:'model-failure-validation',configurePreviewServer(server){
 server.middlewares.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  const path=new URL(req.url??'/', 'http://localhost').pathname;
  if(existsSync(marker)&&path.endsWith('/assets/models/ruler_cube.glb')){
   res.statusCode=503;res.end('Validation: critical model unavailable');return;
  }
  next();
 });
}}],preview:{host:'127.0.0.1',port:4194,strictPort:true}});
server.printUrls();
console.log(`Critical model requests fail while ${marker} exists; remove the marker to test recovery.`);
