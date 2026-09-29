import {it,expect} from 'vitest';
import * as THREE from 'three';
import {canStartPreservation,insideFacility} from '../src/gameplay/facility-access';

it('requires the indoor operating area, proximity and an unobstructed console',()=>{
 const console=new THREE.Mesh(new THREE.BoxGeometry(.8,2,.5),new THREE.MeshBasicMaterial());console.position.set(-25.5,1,-27);console.updateMatrixWorld(true);
 const position={x:-24,y:.9,z:-27},eye=new THREE.Vector3(-24,1.62,-27);
 expect(canStartPreservation(position,eye,console,[console])).toBe(true);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(.2,3,4),new THREE.MeshBasicMaterial());wall.position.set(-24.8,1.5,-27);wall.updateMatrixWorld(true);
 expect(canStartPreservation(position,eye,console,[console,wall])).toBe(false);
 expect(canStartPreservation({x:-24,y:.9,z:-24},new THREE.Vector3(-24,1.62,-24),console,[console])).toBe(false);
 expect(canStartPreservation({x:-20,y:.9,z:-30},new THREE.Vector3(-20,1.62,-30),console,[console])).toBe(false);
 expect(insideFacility({x:-24,y:6,z:-27})).toBe(false);
 expect(insideFacility({x:-24,y:-1,z:-27})).toBe(false);
 console.geometry.dispose();wall.geometry.dispose();(console.material as THREE.Material).dispose();(wall.material as THREE.Material).dispose();
});
