import * as THREE from 'three';
/** Conservative whole-triangle removal against known opaque, axis-aligned static boxes.
 * Partial coverage stays intact. Outward probe preserves coincident exterior surfaces.
 * Geometry is world-baked; caller owns it and excludes its own box from occluders.
 */
export function removeCoveredTriangles(geometry:THREE.BufferGeometry,occluders:THREE.Box3[]){
 const positions=geometry.getAttribute('position'),index=geometry.getIndex(),count=index?.count??positions.count,kept:number[]=[];
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),edge=new THREE.Vector3(),probe=new THREE.Vector3();
 const tolerance=1e-6,depth=1e-5;
 const contains=(box:THREE.Box3,p:THREE.Vector3)=>p.x>=box.min.x-tolerance&&p.x<=box.max.x+tolerance&&p.y>=box.min.y-tolerance&&p.y<=box.max.y+tolerance&&p.z>=box.min.z-tolerance&&p.z<=box.max.z+tolerance;
 for(let i=0;i<count;i+=3){
  const ids=[0,1,2].map(offset=>index?index.getX(i+offset):i+offset);
  a.fromBufferAttribute(positions,ids[0]);b.fromBufferAttribute(positions,ids[1]);c.fromBufferAttribute(positions,ids[2]);
  normal.subVectors(b,a).cross(edge.subVectors(c,a)).normalize();probe.copy(a).add(b).add(c).multiplyScalar(1/3).addScaledVector(normal,depth);
  const covered=occluders.some(box=>contains(box,a)&&contains(box,b)&&contains(box,c)&&probe.x>box.min.x+tolerance&&probe.x<box.max.x-tolerance&&probe.y>box.min.y+tolerance&&probe.y<box.max.y-tolerance&&probe.z>box.min.z+tolerance&&probe.z<box.max.z-tolerance);
  if(!covered)kept.push(...ids);
 }
 geometry.setIndex(kept);return (count-kept.length)/3;
}
