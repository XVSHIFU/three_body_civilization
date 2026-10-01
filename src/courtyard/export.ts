import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createArmillary,dressObserver,observerReadingClip} from './recipes';

/** Invoked by the local export command, never by the shipped entry. */
export async function exportCourtyardAssets(){
 const original=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/courtyard/observer-base.glb`);
 const observer=dressObserver(original.scene),instrument=createArmillary();
 const stoneMap=await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}assets/courtyard/white_sandstone_blocks_02-Diffuse.jpg`);
 stoneMap.colorSpace=THREE.SRGBColorSpace;
 // Deterministic patina is embedded in the GLB; no external texture service at runtime.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(256,256);let seed=17;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=205+Math.sin(x*.09)*Math.sin(y*.07)*18+(seed/4294967296-.5)*28,i=(y*256+x)*4;pixels.data[i]=v;pixels.data[i+1]=v;pixels.data[i+2]=v;pixels.data[i+3]=255;}
 ctx.putImageData(pixels,0,0);const patina=new THREE.CanvasTexture(canvas);patina.colorSpace=THREE.SRGBColorSpace;
 instrument.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;m.map=m.name==='instrument-sandstone'?stoneMap:patina;}});
 const animations=[...original.animations,observerReadingClip(original.animations.find(c=>c.name==='holding-both')!)];
 const exporter=new GLTFExporter();const result:Record<string,string>={};
 for(const [name,object,clips] of [['armillary',instrument,[]],['observer',observer,animations]] as const){
  const buffer=await exporter.parseAsync(object,{binary:true,animations:[...clips]}) as ArrayBuffer;
  let text='';for(const byte of new Uint8Array(buffer))text+=String.fromCharCode(byte);result[name]=btoa(text);
 }
 return result;
}
