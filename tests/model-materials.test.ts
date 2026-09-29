import {it,expect} from 'vitest';
import * as THREE from 'three';
import {prepareModelMaterials} from '../src/renderer/model-materials';
import {createNpcAppearance} from '../src/renderer/npc-appearance';

it('prepares only color atlases for mipmapped sampling and opaque closed-box rendering',()=>{
 const color=new THREE.Texture(),normal=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map:color,normalMap:normal,side:THREE.DoubleSide,alphaTest:.05});
 color.generateMipmaps=false;normal.colorSpace=THREE.NoColorSpace;
 const root=new THREE.Mesh(new THREE.BoxGeometry(),material);prepareModelMaterials(root);
 expect(color.generateMipmaps).toBe(true);expect(color.magFilter).toBe(THREE.NearestFilter);expect(color.minFilter).toBe(THREE.NearestMipmapLinearFilter);expect(color.colorSpace).toBe(THREE.SRGBColorSpace);
 expect(normal.colorSpace).toBe(THREE.NoColorSpace);expect(material.side).toBe(THREE.FrontSide);expect(material.alphaTest).toBe(0);expect(material.transparent).toBe(false);
});

it('recolors textured NPC torsos and accessories through palette UVs while retaining source and instance isolation',()=>{
 const source=new THREE.Group(),map=new THREE.Texture(),material=new THREE.MeshStandardMaterial({map}),geometry=new THREE.BoxGeometry();
 const torso=new THREE.Group(),head=new THREE.Group();torso.name='torso';head.name='head';torso.add(new THREE.Mesh(geometry,material));head.add(new THREE.Mesh(geometry,material));source.add(torso,head);
 const originalUv=Array.from(geometry.getAttribute('uv').array);
 const observer=createNpcAppearance(source,0),guard=createNpcAppearance(source,1);
 const observerTorso=observer.getObjectByName('torso')!.children[0] as THREE.Mesh;
 const guardTorso=guard.getObjectByName('torso')!.children[0] as THREE.Mesh;
 expect(observerTorso.geometry.getAttribute('uv').getX(0)).toBeCloseTo(5/6);
 expect(guardTorso.geometry.getAttribute('uv').getX(0)).toBeCloseTo(.5);
 const brim=observer.getObjectByName('hat_brim') as THREE.Mesh;
 expect(brim.geometry.getAttribute('uv').getX(0)).toBeCloseTo(.5);
 expect(observerTorso.geometry.getAttribute('color')).toBeUndefined();
 expect((observerTorso.material as THREE.MeshStandardMaterial).map).toBe(map);
 expect(observerTorso.material).not.toBe(guardTorso.material);expect(observerTorso.material).not.toBe(material);
 expect(Array.from(geometry.getAttribute('uv').array)).toEqual(originalUv);expect(source.getObjectByName('hat_brim')).toBeUndefined();
});
