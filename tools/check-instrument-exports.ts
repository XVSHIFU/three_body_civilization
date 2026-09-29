import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {embeddedModelLoader} from '../tests/embedded-model-loader';
const sha=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
const requested=process.argv.slice(2);
const environmentIds=['ground_slab','ground_band','ground_platform','wall_corner','railing','stone_cluster','supply_crate','route_flag'];
for(const id of requested.length?requested:['thermometer','archive_desk']){
 if(!['thermometer','archive_desk','house_terrace','house_tower','house_terrace_ruined','house_tower_ruined',...environmentIds].includes(id))throw Error('Unsupported staged asset');
 const sourceFolder=environmentIds.includes(id)?'environment':id.startsWith('house_')?'buildings':'second-batch';
 const design=JSON.parse(readFileSync(`assets/source/${sourceFolder}/${id}.design.json`,'utf8'));
 const sourceBytes=readFileSync(`assets/source/${sourceFolder}/${id}.bbmodel`),source=JSON.parse(sourceBytes.toString()),bytes=readFileSync(`reports/blockbench/${id}-native.glb`);
 const gltf=await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
 let maxBoundsError=0,triangles=0,uvSamples=0;const textures=new Set<THREE.Texture>();
 for(const cube of source.elements){
  const group=gltf.scene.getObjectByName(cube.name);if(!group)throw Error(`Missing node ${cube.name}`);
  const bounds=new THREE.Box3().setFromObject(group);
  for(let axis=0;axis<3;axis++)for(const [actual,expected] of [[bounds.min.toArray()[axis],cube.from[axis]/16],[bounds.max.toArray()[axis],cube.to[axis]/16]])maxBoundsError=Math.max(maxBoundsError,Math.abs(actual-expected));
  group.traverse(object=>{if(!(object instanceof THREE.Mesh))return;const geometry=object.geometry;triangles+=(geometry.index?.count??geometry.attributes.position.count)/3;
   const material=object.material as THREE.MeshStandardMaterial,map=material.map as THREE.DataTexture;if(!map)throw Error('Missing embedded palette');textures.add(map);const {data,width,height}=map.image;if(!data||width!==512||height!==512)throw Error('Wrong palette dimensions');
   const sourceU=(cube.faces.north.uv[0]+cube.faces.north.uv[2])/2/512,index=Math.min(2,Math.floor(sourceU*3)),hex=[0xafa38c,0x4f6267,0xbc9658][index],expected=[hex>>>16,(hex>>>8)&255,hex&255,255];
   const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const x=Math.min(width-1,Math.max(0,Math.floor(uv.getX(i)*width))),y=Math.min(height-1,Math.max(0,Math.floor(uv.getY(i)*height))),at=(y*width+x)*4;if(expected.some((value,k)=>data[at+k]!==value))throw Error(`Palette mismatch ${cube.name}`);uvSamples++;}
  });
 }
 if(maxBoundsError>1e-6||triangles!==design.triangles||triangles>design.triangleBudget||textures.size!==1)throw Error(`Geometry budget mismatch ${id}`);
 const report={id,passed:true,sourceSha256:sha(sourceBytes),nativeSha256:sha(bytes),bytes:bytes.length,triangles,meshCount:source.elements.length,maxBoundsError,uvSamples,embeddedTextureSize:[512,512],exportSettings:{scale:16,encoding:'Binary (glb)',embedTextures:true},unverified:['browser GLTFLoader shading','runtime collision and interactions','5/20/50m recognition']};
 writeFileSync(`reports/blockbench/${id}-source-roundtrip.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
