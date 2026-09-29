import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {disposeAssets,loadAssets} from '../src/renderer/assets';
import {disposeResources} from '../src/renderer/dispose-resources';

it('releases shared asset and scene resources once, including unused GLTF scenes and shader textures',()=>{
 const geometry=new THREE.BoxGeometry(),texture=new THREE.Texture(),otherTexture=new THREE.Texture();
 const material=new THREE.MeshStandardMaterial({map:texture,normalMap:texture});
 const shader=new THREE.ShaderMaterial({uniforms:{layers:{value:[texture,otherTexture]}}});
 const root=new THREE.Group(),alternate=new THREE.Group(),scene=new THREE.Scene();
 root.add(new THREE.Mesh(geometry,material));
 alternate.add(new THREE.Mesh(geometry,shader));
 scene.add(root.clone());scene.background=otherTexture;scene.environment=texture;
 const disposals=[geometry,material,shader,texture,otherTexture].map(resource=>vi.spyOn(resource,'dispose'));
 const model={scene:root,scenes:[root,alternate]} as unknown as GLTF;
 const library=new Map([['model',model]]);
 disposeAssets(library,[scene]);
 expect(library.size).toBe(0);
 disposals.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
 disposeAssets(library);
 disposals.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
});

it('closes shared decoded bitmaps once but leaves ordinary image data alone',()=>{
 class Bitmap {close=vi.fn();}
 vi.stubGlobal('ImageBitmap',Bitmap);
 try{
  const bitmap=new Bitmap(),ordinary={close:vi.fn()},a=new THREE.Texture(),b=new THREE.Texture(),c=new THREE.Texture();
  a.source.data=bitmap;b.source.data=bitmap;c.source.data=ordinary;
  const root=new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:a,normalMap:b,roughnessMap:c})));
  disposeResources([root]);
  expect(bitmap.close).toHaveBeenCalledTimes(1);
  expect(ordinary.close).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});

it('cleans the just-loaded model when its size validation fails',async()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(0,0,0),texture=new THREE.Texture();
 const material=new THREE.MeshStandardMaterial({map:texture});root.add(new THREE.Mesh(geometry,material));
 const disposals=[geometry,texture,material].map(resource=>vi.spyOn(resource,'dispose'));
 const loader=vi.spyOn(GLTFLoader.prototype,'loadAsync').mockResolvedValue({scene:root,scenes:[root]} as unknown as GLTF);
 try{
  await expect(loadAssets(()=>{})).rejects.toMatchObject({message:'关键模型未能加载。请检查连接后重试初始化；已有档案仍保留。',cause:expect.objectContaining({message:expect.stringContaining('模型尺寸异常')})});
  expect(loader).toHaveBeenCalledTimes(1);
  disposals.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
 }finally{loader.mockRestore();}
});

it('disposes instance buffers and both shadow render targets once across shared roots',()=>{
 const scene=new THREE.Scene(),light=new THREE.DirectionalLight(),instance=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),3);
 light.shadow.map=new THREE.WebGLRenderTarget(16,16);light.shadow.mapPass=new THREE.WebGLRenderTarget(8,8);
 scene.add(light,instance);
 const shadow=vi.spyOn(light.shadow.map,'dispose'),pass=vi.spyOn(light.shadow.mapPass,'dispose'),instances=vi.spyOn(instance,'dispose');
 disposeResources([scene,light,instance]);
 expect(shadow).toHaveBeenCalledTimes(1);expect(pass).toHaveBeenCalledTimes(1);expect(instances).toHaveBeenCalledTimes(1);
});
