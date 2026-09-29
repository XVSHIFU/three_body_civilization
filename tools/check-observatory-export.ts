import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {embeddedModelLoader} from '../tests/embedded-model-loader';
const sourcePath='assets/source/observatory/observatory_assembly.bbmodel',nativePath='reports/blockbench/observatory_assembly-native.glb';
const sourceBytes=readFileSync(sourcePath),bytes=readFileSync(nativePath),source=JSON.parse(sourceBytes.toString());
const gltf=await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
let maxVertexError=0,triangles=0,uvSamples=0,meshCount=0;const textures=new Set<THREE.Texture>();
for(const group of source.outliner){
 const origin=new THREE.Vector3(...group.origin).divideScalar(16),rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...group.rotation.map((v:number)=>v*Math.PI/180) as [number,number,number]));
 for(const child of group.children){
  const cube=source.elements.find((e:any)=>e.uuid===child);if(!cube)throw Error('Missing source cube');
  const object=gltf.scene.getObjectByName(cube.name);if(!object)throw Error(`Missing native cube ${cube.name}`);
  const expected:THREE.Vector3[]=[];for(const x of [cube.from[0],cube.to[0]])for(const y of [cube.from[1],cube.to[1]])for(const z of [cube.from[2],cube.to[2]])expected.push(new THREE.Vector3(x,y,z).divideScalar(16).sub(origin).applyQuaternion(rotation).add(origin));
  const actual:THREE.Vector3[]=[];
  object.traverse(node=>{if(!(node instanceof THREE.Mesh))return;meshCount++;const geometry=node.geometry;triangles+=(geometry.index?.count??geometry.attributes.position.count)/3;
   const pos=geometry.attributes.position;for(let i=0;i<pos.count;i++)actual.push(new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(node.matrixWorld));
   const map=(node.material as THREE.MeshStandardMaterial).map as THREE.DataTexture;if(!map)throw Error('Missing palette');textures.add(map);
   const {data,width,height}=map.image;if(!data||width!==512||height!==512)throw Error('Palette size differs');
   const sourceU=(cube.faces.north.uv[0]+cube.faces.north.uv[2])/2/512,hex=[0xafa38c,0x4f6267,0xbc9658][Math.min(2,Math.floor(sourceU*3))],rgba=[hex>>>16,(hex>>>8)&255,hex&255,255];
   const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const x=Math.min(width-1,Math.max(0,Math.floor(uv.getX(i)*width))),y=Math.min(height-1,Math.max(0,Math.floor(uv.getY(i)*height))),at=(y*width+x)*4;if(rgba.some((v,k)=>data[at+k]!==v))throw Error(`Palette mismatch ${cube.name}`);uvSamples++;}
  });
  if(!actual.length)throw Error(`Empty cube ${cube.name}`);
  for(const [a,b] of [[actual,expected],[expected,actual]])for(const v of a)maxVertexError=Math.max(maxVertexError,Math.min(...b.map(p=>p.distanceTo(v))));
 }
}
let allMeshes=0;gltf.scene.traverse(n=>{if(n instanceof THREE.Mesh)allMeshes++;});
if(maxVertexError>1e-5||meshCount!==source.elements.length||allMeshes!==meshCount||triangles!==2544||textures.size!==1)throw Error(JSON.stringify({maxVertexError,meshCount,allMeshes,triangles,textures:textures.size}));
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const report={passed:true,sourceSha256:sha(sourceBytes),nativeSha256:sha(bytes),bytes:bytes.length,meshCount,triangles,maxVertexError,uvSamples,embeddedTextureSize:[512,512],exportSettings:{scale:16,encoding:'Binary (glb)',embedTextures:true},scope:'Native assembly compared against every transformed source cube corner and palette sample. Handoff asset; runtime uses modular assets.'};
writeFileSync('reports/blockbench/observatory_assembly-source-roundtrip.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
