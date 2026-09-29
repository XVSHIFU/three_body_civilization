import {it,expect} from 'vitest';
import * as THREE from 'three';
import {removeCoveredTriangles} from '../src/renderer/covered-triangles';
const bounds=(x:number,w=2)=>new THREE.Box3(new THREE.Vector3(x-w/2,-1,-1),new THREE.Vector3(x+w/2,1,1));
it('removes only the shared face of adjacent opaque cubes',()=>{
 const geometry=new THREE.BoxGeometry(2,2,2);expect(removeCoveredTriangles(geometry,[bounds(2)])).toBe(2);expect(geometry.index!.count).toBe(30);
});
it('retains partially covered faces and coincident exterior faces',()=>{
 const partial=new THREE.Box3(new THREE.Vector3(1,-.5,-.5),new THREE.Vector3(3,.5,.5));
 expect(removeCoveredTriangles(new THREE.BoxGeometry(2,2,2),[partial])).toBe(0);
 expect(removeCoveredTriangles(new THREE.BoxGeometry(2,2,2),[bounds(0)])).toBe(0);
});
it('removes a fully enclosed cube without altering vertex attributes',()=>{
 const geometry=new THREE.BoxGeometry(2,2,2),uv=Array.from(geometry.attributes.uv.array);
 expect(removeCoveredTriangles(geometry,[new THREE.Box3(new THREE.Vector3(-2,-2,-2),new THREE.Vector3(2,2,2))])).toBe(12);
 expect(Array.from(geometry.attributes.uv.array)).toEqual(uv);expect(geometry.index!.count).toBe(0);
});
