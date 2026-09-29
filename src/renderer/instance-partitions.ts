import * as THREE from 'three';

/** Group by X/Z cell while retaining full per-instance transforms and shared resources. */
export function partitionInstances(geometry:THREE.BufferGeometry,material:THREE.Material,transforms:THREE.Matrix4[],cellSize=32):THREE.InstancedMesh[] {
 if(!Number.isFinite(cellSize)||cellSize<=0)throw Error('Instance cell size must be positive');
 const cells=new Map<string,THREE.Matrix4[]>();
 for(const matrix of transforms){
  const x=matrix.elements[12],z=matrix.elements[14];
  if(!matrix.elements.every(Number.isFinite))throw Error('Invalid instance transform');
  const key=`${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`;
  if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(matrix);
 }
 return [...cells].map(([cell,matrices])=>{
  const mesh=new THREE.InstancedMesh(geometry,material,matrices.length);mesh.name=`skyline-cell:${cell}`;
  matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));mesh.instanceMatrix.needsUpdate=true;
  mesh.computeBoundingBox();mesh.computeBoundingSphere();return mesh;
 });
}
