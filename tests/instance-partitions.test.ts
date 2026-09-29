import {it,expect} from 'vitest';
import * as THREE from 'three';
import {partitionInstances} from '../src/renderer/instance-partitions';
import {disposeResources} from '../src/renderer/dispose-resources';

it('preserves every instance and lets a forward view cull rear partitions',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();
 const transforms=Array.from({length:44},(_,i)=>{
  const angle=i/44*Math.PI*2,r=108+(i%3)*12,h=8+(i*7%19);
  return new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(angle)*r,h/2,Math.sin(angle)*r),new THREE.Quaternion(),new THREE.Vector3(5+i%4,h,6));
 });
 const partitions=partitionInstances(geometry,material,transforms),retrieved=new THREE.Matrix4();
 const actual:number[][]=[];
 for(const mesh of partitions){
  expect(mesh.geometry).toBe(geometry);expect(mesh.material).toBe(material);
  expect(mesh.boundingSphere!.radius).toBeLessThan(40);
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,retrieved);actual.push([...retrieved.elements]);}
 }
 expect(actual).toHaveLength(44);
 for(const matrix of transforms)expect(actual.some(values=>values.every((value,i)=>Math.abs(value-matrix.elements[i])<1e-4))).toBe(true);
 const camera=new THREE.PerspectiveCamera(65,16/9,.1,500);camera.position.set(0,1.62,0);camera.lookAt(0,1.62,-1);camera.updateMatrixWorld(true);
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 const submitted=partitions.filter(mesh=>frustum.intersectsObject(mesh)).reduce((sum,mesh)=>sum+mesh.count,0);
 expect(submitted).toBeGreaterThan(0);expect(submitted).toBeLessThan(44);
 disposeResources(partitions);
});
