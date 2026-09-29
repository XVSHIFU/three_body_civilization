import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {observatoryLayout} from '../src/renderer/observatory-layout';
import {environmentPlacements} from '../src/renderer/environment';
import {stonePlaques} from '../src/gameplay/wayfinding';
import {inspectGlb} from './glb-budget';
const layout=observatoryLayout();
const flags=environmentPlacements().filter(p=>p.id==='route_flag'&&p.position[1]===12);
const plaques=stonePlaques.filter(p=>p.id==='observatory-plaque');
const modules=[['stairs',layout.stairs.length],['railing',layout.rails.length],['route_flag',flags.length]] as const;
const assets=modules.map(([id,instances])=>{const bytes=readFileSync(`public/assets/models/${id}.glb`);return {id,instances,trianglesPerInstance:inspectGlb(bytes).triangles,sha256:createHash('sha256').update(bytes).digest('hex')};});
// Includes every generated box face before runtime covered-face removal.
// Each plaque is one stone box plus three raised inscription lines.
const generatedBoxes=layout.boxes.length+plaques.length*4;
const triangles=generatedBoxes*12+assets.reduce((n,a)=>n+a.instances*a.trianglesPerInstance,0);
if(triangles>6000)throw Error(`Observatory exceeds 6000 triangles: ${triangles}`);
const report={scope:'Complete observatory, both stairs, retaining walls, platform rails, high instrument, flag and reading plaque; before runtime face culling',budget:6000,triangles,generatedBoxes,assets,layout,flags,plaques};
writeFileSync('reports/observatory-assembly.json',JSON.stringify(report,null,2)+'\n');
console.log(`Observatory: ${triangles}/6000 triangles before culling; assembly saved to reports/observatory-assembly.json`);
