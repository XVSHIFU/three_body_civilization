import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {inspectGlb,assertAssetBudget} from '../tools/glb-budget';

it('measures actual geometry and native embedded PNG dimensions',()=>{
 const cube=inspectGlb(readFileSync('public/assets/models/ruler_cube.glb'));
 expect(cube).toEqual({triangles:12,materials:1,textures:[{width:512,height:512}]});
 const npc=inspectGlb(readFileSync('reports/blockbench/npc-native-palette.glb'));
 expect(npc.triangles).toBe(72);expect(npc.materials).toBe(1);expect(npc.textures).toEqual([{width:64,height:64}]);
 expect(()=>assertAssetBudget('npc',npc,{triangles:70,materials:1})).toThrow('differ');
 expect(()=>assertAssetBudget('npc',{...npc,textures:[{width:512,height:64}]},npc)).toThrow('Texture budget');
 expect(()=>assertAssetBudget('wall',{triangles:600,materials:1,textures:[]},{triangles:600,materials:1})).toThrow('Geometry budget');
 expect(()=>assertAssetBudget('facility',{triangles:1500,materials:1,textures:[]},{triangles:1500,materials:1})).not.toThrow();
});

it('rejects truncated binary data and accessor counts that exceed the real buffer',()=>{
 const cube=readFileSync('public/assets/models/ruler_cube.glb');
 expect(()=>inspectGlb(cube.subarray(0,cube.length-4))).toThrow('header');
 const jsonLength=cube.readUInt32LE(12),json=JSON.parse(cube.subarray(20,20+jsonLength).toString());
 json.accessors[json.meshes[0].primitives[0].indices].count=999999;
 const encoded=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(padded);
 const rest=cube.subarray(20+jsonLength),bad=Buffer.alloc(20+padded.length+rest.length);
 cube.copy(bad,0,0,20);bad.writeUInt32LE(bad.length,8);bad.writeUInt32LE(padded.length,12);padded.copy(bad,20);rest.copy(bad,20+padded.length);
 expect(()=>inspectGlb(bad)).toThrow('Accessor exceeds');
});
