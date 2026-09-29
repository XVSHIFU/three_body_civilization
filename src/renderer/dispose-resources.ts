import * as THREE from 'three';

/** Dispose resources owned by one runtime together so shared GLTF resources are released once. */
export function disposeResources(roots:Iterable<THREE.Object3D>):void {
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>(),bitmaps=new Set<ImageBitmap>();
 const instances=new Set<THREE.InstancedMesh>(),lights=new Set<THREE.DirectionalLight|THREE.SpotLight|THREE.PointLight>();
 const collectTexture=(value:unknown)=>{if(value instanceof THREE.Texture)textures.add(value);};
 for(const root of roots)root.traverse(object=>{
  if(object instanceof THREE.InstancedMesh)instances.add(object);
  if(object instanceof THREE.DirectionalLight||object instanceof THREE.SpotLight||object instanceof THREE.PointLight)lights.add(object);
  if(object instanceof THREE.Mesh||object instanceof THREE.Line||object instanceof THREE.Points){
   geometries.add(object.geometry);
   for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);
  }
  if(object instanceof THREE.Scene){collectTexture(object.background);collectTexture(object.environment);}
 });
 for(const material of materials){
  Object.values(material).forEach(collectTexture);
  if(material instanceof THREE.ShaderMaterial)for(const uniform of Object.values(material.uniforms)){
   if(Array.isArray(uniform.value))uniform.value.forEach(collectTexture);else collectTexture(uniform.value);
  }
 }
 for(const texture of textures){
  const images=Array.isArray(texture.source.data)?texture.source.data:[texture.source.data];
  for(const image of images)if(typeof ImageBitmap!=='undefined'&&image instanceof ImageBitmap)bitmaps.add(image);
  texture.dispose();
 }
 bitmaps.forEach(bitmap=>bitmap.close());
 instances.forEach(instance=>instance.dispose());
 lights.forEach(light=>light.dispose());
 geometries.forEach(geometry=>geometry.dispose());
 materials.forEach(material=>material.dispose());
}
