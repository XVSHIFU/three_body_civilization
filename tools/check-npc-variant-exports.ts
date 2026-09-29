import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {embeddedModelLoader} from '../tests/embedded-model-loader';
import {createNpcAppearance,npcAppearances} from '../src/renderer/npc-appearance';
import {inspectGlb} from './glb-budget';
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
async function load(path:string){const bytes=readFileSync(path);return {bytes,gltf:await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')};}
const base=await load('public/assets/models/npc.glb'),reports=[];
function meshes(root:THREE.Object3D){const result=new Map<string,THREE.Mesh>();root.traverse(node=>{if(node instanceof THREE.Mesh){if(result.has(node.name))throw Error(`Duplicate mesh ${node.name}`);result.set(node.name,node);}});return result;}
function vertices(mesh:THREE.Mesh){const p=mesh.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));}
function paletteSamples(mesh:THREE.Mesh){const material=mesh.material as THREE.MeshStandardMaterial,map=material.map as THREE.DataTexture;if(!map)throw Error('Missing palette');const {data,width,height}=map.image;if(width!==64||height!==64||!data)throw Error('Unexpected palette size');const uv=mesh.geometry.attributes.uv;return Array.from({length:uv.count},(_,i)=>{const x=Math.min(width-1,Math.max(0,Math.floor(uv.getX(i)*width))),y=Math.min(height-1,Math.max(0,Math.floor(uv.getY(i)*height))),offset=(y*width+x)*4;return Array.from(data.slice(offset,offset+4)).join(',');});}
for(let index=0;index<npcAppearances.length;index++){
 const id=`npc_variant_${index}`,native=await load(`reports/blockbench/${id}-native.glb`),source=readFileSync(`assets/source/npc-variants/${id}.bbmodel`);
 const runtime=createNpcAppearance(base.gltf.scene,index),actual=meshes(native.gltf.scene),expected=meshes(runtime),budget=inspectGlb(native.bytes);
 if([...actual.keys()].sort().join()!==[...expected.keys()].sort().join())throw Error(`Mesh names differ: ${id}`);
 if(budget.triangles!==actual.size*12||budget.triangles>1200||budget.materials!==1)throw Error(`NPC budget differs: ${id}`);
 let uvSamples=0,maxVertexError=0,maxCurveError=0,poses=0,curveCount=0;
 for(const [name,mesh] of actual){const colors=paletteSamples(mesh),reference=paletteSamples(expected.get(name)!);if(new Set(colors).size!==1||new Set(reference).size!==1||colors[0]!==reference[0])throw Error(`Palette differs ${id}/${name}`);uvSamples+=colors.length;}
 function comparePose(){native.gltf.scene.updateMatrixWorld(true);runtime.updateMatrixWorld(true);for(const [name,mesh] of actual){const a=vertices(mesh),b=vertices(expected.get(name)!);for(const [points,reference] of [[a,b],[b,a]])for(const point of points)maxVertexError=Math.max(maxVertexError,Math.min(...reference.map(v=>v.distanceTo(point))));}poses++;}
 comparePose();
 if(native.gltf.animations.length!==base.gltf.animations.length)throw Error('Animation count differs');
 const nativeMixer=new THREE.AnimationMixer(native.gltf.scene),runtimeMixer=new THREE.AnimationMixer(runtime);
 for(const clip of native.gltf.animations){
  const reference=base.gltf.animations.find(c=>c.name===clip.name);if(!reference||clip.duration!==reference.duration||clip.tracks.length!==reference.tracks.length)throw Error(`Clip differs ${id}/${clip.name}`);
  for(const track of clip.tracks){const original=reference.tracks.find(t=>t.name===track.name);if(!original||track.getInterpolation()!==original.getInterpolation()||track.times.length!==original.times.length||track.values.length!==original.values.length)throw Error('Animation binding differs');for(const key of ['times','values'] as const)for(let i=0;i<track[key].length;i++)maxCurveError=Math.max(maxCurveError,Math.abs(track[key][i]-original[key][i]));curveCount++;}
  const action=nativeMixer.clipAction(clip),referenceAction=runtimeMixer.clipAction(reference);action.play();referenceAction.play();
  for(const fraction of [0,.17,.37,.63,.91]){nativeMixer.setTime(clip.duration*fraction);runtimeMixer.setTime(reference.duration*fraction);comparePose();}
  nativeMixer.stopAllAction();runtimeMixer.stopAllAction();
 }
 if(maxVertexError>1e-6||maxCurveError>1e-6)throw Error(JSON.stringify({id,maxVertexError,maxCurveError}));
 reports.push({id,name:npcAppearances[index].name,sourceSha256:sha(source),nativeSha256:sha(native.bytes),bytes:native.bytes.length,triangles:budget.triangles,meshes:actual.size,uvSamples,clips:native.gltf.animations.map(c=>c.name),curveCount,poses,maxVertexError,maxCurveError});
}
writeFileSync('reports/blockbench/npc-variants-roundtrip.json',JSON.stringify({passed:true,baseSha256:sha(base.bytes),scope:'Six native Blockbench exports versus production base GLB with runtime accessories: rest and five poses per clip, every world-space mesh vertex, flat palette samples and all animation tracks.',reports},null,2)+'\n');
console.log(JSON.stringify(reports));
