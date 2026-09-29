import * as THREE from 'three';

/** These project assets are opaque, closed cuboids with an embedded solid-swatch color atlas. */
export function prepareModelMaterials(root:THREE.Object3D){
 const textures=new Set<THREE.Texture>();
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!(material instanceof THREE.MeshStandardMaterial)||!material.map)continue;
   textures.add(material.map);
   material.side=THREE.FrontSide;material.alphaTest=0;material.transparent=false;
  }
 });
 for(const texture of textures){
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=true;texture.magFilter=THREE.NearestFilter;
  texture.minFilter=THREE.NearestMipmapLinearFilter;texture.needsUpdate=true;
 }
}
