import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {embeddedModelLoader} from '../tests/embedded-model-loader';
import {createEnvironment} from '../src/renderer/environment';
import type {AssetLibrary} from '../src/renderer/assets';
import volumes from '../content/solid-volumes/environment.json';
import {inspectGlb} from './glb-budget';
await RAPIER.init();const assets:AssetLibrary=new Map(),original:Record<string,number>={},hashes:Record<string,string>={};
for(const {id} of volumes){const bytes=readFileSync(`public/assets/models/${id}.glb`);hashes[id]=createHash('sha256').update(bytes).digest('hex');original[id]=inspectGlb(bytes).triangles;assets.set(id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
const physics=new RAPIER.World({x:0,y:0,z:0}),built=createEnvironment(new THREE.Scene(),physics,assets,[]);
const report={modelSha256:hashes,removedTrianglesPerTemplate:built.removedTriangles,originalPlacedTriangles:built.placements.reduce((n,p)=>n+original[p.id],0),optimizedPlacedTriangles:built.cells.reduce((n,c)=>n+c.geometry.index!.count/3*c.count,0),scope:'Eight environment families, all placed instances. Only whole triangles covered by verified opaque source cubes removed. Collision unchanged. No cross-instance or partial-triangle removal.',unverified:['moving-view appearance','GPU timing or FPS improvement']};
writeFileSync('reports/environment-geometry.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));physics.free();
