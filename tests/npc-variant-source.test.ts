import {readFileSync} from 'node:fs';
import {it,expect} from 'vitest';
import * as THREE from 'three';
import {npcVariantSource,type NpcSource} from '../tools/npc-variant-source';
import {createNpcAppearance,npcAppearances} from '../src/renderer/npc-appearance';
import {embeddedModelLoader} from './embedded-model-loader';
it('matches editable accessory world bounds to the actual production GLB rig for all six appearances',async()=>{
 const source=JSON.parse(readFileSync('assets/source/npc.bbmodel','utf8')) as NpcSource,original=JSON.stringify(source);
 const bytes=readFileSync('public/assets/models/npc.glb'),gltf=await embeddedModelLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(let i=0;i<6;i++){
  const variant=npcVariantSource(source,i),runtime=createNpcAppearance(gltf.scene,i);runtime.updateMatrixWorld(true);
  expect(JSON.parse(readFileSync(`assets/source/npc-variants/npc_variant_${i}.bbmodel`,'utf8'))).toEqual(variant);
  expect(variant.animations).toEqual(source.animations);expect(variant.textures).toEqual(source.textures);
  for(const accessory of npcAppearances[i].accessories){
   const cube=variant.elements.find(e=>e.name===accessory.name)!,mesh=runtime.getObjectByName(accessory.name)!;
   const bounds=new THREE.Box3().setFromObject(mesh);
   for(let axis=0;axis<3;axis++){expect(cube.from[axis]/16).toBeCloseTo(bounds.min.toArray()[axis],6);expect(cube.to[axis]/16).toBeCloseTo(bounds.max.toArray()[axis],6);}
   expect(variant.outliner.find(b=>b.name===accessory.bone)!.children).toContain(cube.uuid);
  }
 }
 expect(JSON.stringify(source)).toBe(original);
});
