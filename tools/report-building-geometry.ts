import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {embeddedModelLoader} from '../tests/embedded-model-loader';
import type {AssetLibrary} from '../src/renderer/assets';
import {createBuildings} from '../src/renderer/buildings';
await RAPIER.init();const assets:AssetLibrary=new Map(),hashes:Record<string,string>={};
for(const id of ['house_terrace','house_tower','house_terrace_ruined','house_tower_ruined']){const bytes=readFileSync(`public/assets/models/${id}.glb`);hashes[id]=createHash('sha256').update(bytes).digest('hex');assets.set(id,await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));}
const physics=new RAPIER.World({x:0,y:0,z:0}),built=createBuildings(new THREE.Scene(),physics,assets,[]);
const report={modelSha256:hashes,removedTrianglesPerTemplate:built.removedTriangles,intactCityTriangles:built.states.reduce((n,s)=>n+s.intact.geometry.index!.count/3,0),ruinedCityTriangles:built.states.reduce((n,s)=>n+s.ruined.geometry.index!.count/3,0),scope:'Six houses only. Whole triangles enclosed by known opaque structural boxes; partially covered faces retained.',unverified:['browser moving-view appearance','GPU timing or FPS improvement','all internal faces removed']};
writeFileSync('reports/building-geometry.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));physics.free();
