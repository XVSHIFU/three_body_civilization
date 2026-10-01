import {createShelter} from '../src/courtyard/shelter';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import * as THREE from 'three';
import manifest from '../licenses/courtyard/manifest.json';
import {embeddedModelLoader} from './embedded-model-loader';
import {createArmillary} from '../src/courtyard/recipes';

it('keeps courtyard source attribution and exact distributed bytes together',()=>{
 for(const file of manifest.files){const bytes=readFileSync(file.path);expect(bytes.length,file.path).toBe(file.bytes);expect(createHash('sha256').update(bytes).digest('hex'),file.path).toBe(file.sha256);}
});

async function load(name:string){const bytes=readFileSync(`public/assets/courtyard/${name}.glb`);return embeddedModelLoader(1024).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
it('reads the exported instrument with the editable source dimensions and three materials',async()=>{
 const exported=(await load('armillary')).scene,source=createArmillary();
 const a=new THREE.Box3().setFromObject(exported),b=new THREE.Box3().setFromObject(source);
 expect(a.min.distanceTo(b.min)).toBeLessThan(.0001);expect(a.max.distanceTo(b.max)).toBeLessThan(.0001);
 const materials=new Set();let triangles=0;exported.traverse(o=>{if(o instanceof THREE.Mesh){materials.add(o.material);triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;}});
 expect(materials.size).toBe(3);expect(triangles).toBeGreaterThan(1000);expect(triangles).toBeLessThan(15000);
});
it('reads the dressed character, embedded head texture and named node animation',async()=>{
 const model=await load('observer');expect(model.animations).toHaveLength(28);
 const clip=model.animations.find(c=>c.name==='read-ledger');expect(clip).toBeDefined();
 const mixer=new THREE.AnimationMixer(model.scene);mixer.clipAction(clip!).play();mixer.update(.1);
 expect(model.scene.getObjectByName('arm-right')!.rotation.x).toBeCloseTo(-.9,2);
 const head=model.scene.getObjectByName('head') as THREE.Mesh;expect((head.material as THREE.MeshStandardMaterial).map).toBeTruthy();
 const size=new THREE.Box3().setFromObject(model.scene).getSize(new THREE.Vector3()).multiplyScalar(.72);
 expect(size.y).toBeGreaterThan(1.8);expect(size.y).toBeLessThan(2.3);
});

it('loads the shelter with separately addressable console/body and authored metre-scale collisions',async()=>{
 const model=(await load('shelter')).scene,root=model.getObjectByName('preservation-shelter')!,source=createShelter();
 expect(root).toBeTruthy();expect(model.getObjectByName('preservation-console')).toBeTruthy();expect(model.getObjectByName('preserved-body')).toBeTruthy();
 expect(root.userData.collisions).toEqual(source.userData.collisions);
 for(const box of root.userData.collisions){expect(box.size.every((n:number)=>n>0)).toBe(true);}
 const actual=new THREE.Box3().setFromObject(model),expected=new THREE.Box3().setFromObject(source);expect(actual.min.distanceTo(expected.min)).toBeLessThan(.0001);expect(actual.max.distanceTo(expected.max)).toBeLessThan(.0001);
});
