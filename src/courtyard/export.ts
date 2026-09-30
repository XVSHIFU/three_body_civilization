import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createArmillary,dressObserver,observerReadingClip} from './recipes';

/** Invoked by the local export command, never by the shipped entry. */
export async function exportCourtyardAssets(){
 const original=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/courtyard/observer-base.glb`);
 const observer=dressObserver(original.scene),instrument=createArmillary();
 const animations=[...original.animations,observerReadingClip(original.animations.find(c=>c.name==='holding-both')!)];
 const exporter=new GLTFExporter();const result:Record<string,string>={};
 for(const [name,object,clips] of [['armillary',instrument,[]],['observer',observer,animations]] as const){
  const buffer=await exporter.parseAsync(object,{binary:true,animations:[...clips]}) as ArrayBuffer;
  let text='';for(const byte of new Uint8Array(buffer))text+=String.fromCharCode(byte);result[name]=btoa(text);
 }
 return result;
}
