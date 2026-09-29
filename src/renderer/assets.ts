import manifest from '../../content/assets/manifest.json';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {disposeResources} from './dispose-resources';
import {prepareModelMaterials} from './model-materials';
export const assetIds=['ruler_cube','wall','doorway','stairs','observatory_pillar','npc','facility','thermometer','archive_desk','house_terrace','house_tower','house_terrace_ruined','house_tower_ruined','ground_slab','ground_band','ground_platform','wall_corner','railing','stone_cluster','supply_crate','route_flag'] as const;
export type AssetLibrary=Map<string,GLTF>;
export function disposeAssets(assets:AssetLibrary,additionalRoots:THREE.Object3D[]=[]){disposeResources([...additionalRoots,...[...assets.values()].flatMap(model=>[model.scene,...model.scenes])]);assets.clear();}
export async function loadAssets(progress:(label:string)=>void):Promise<AssetLibrary>{const loader=new GLTFLoader(),assets:AssetLibrary=new Map();try{for(const id of assetIds){progress(`加载核心模型 ${assets.size+1} / ${assetIds.length} · ${id}`);const entry=manifest.find(a=>a.id===id);if(!entry)throw Error(`模型清单缺少 ${id}`);const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}${entry.path}?v=${entry.sha256}`);assets.set(id,gltf);prepareModelMaterials(gltf.scene);const size=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());if(![size.x,size.y,size.z].every(v=>Number.isFinite(v)&&v>0))throw Error(`模型尺寸异常：${id}`);}return assets;}catch(e){disposeAssets(assets);throw Error('关键模型未能加载。请检查连接后重试初始化；已有档案仍保留。',{cause:e});}}

