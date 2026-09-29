/** Inspect embedded GLB bytes. Unsupported compressed/external resources fail closed. */
export function inspectGlb(data:Buffer){
 if(data.length<20||data.readUInt32LE(0)!==0x46546c67||data.readUInt32LE(4)!==2||data.readUInt32LE(8)!==data.length)throw Error('Invalid GLB header');
 let json:any,bin:Buffer|undefined;
 for(let offset=12;offset<data.length;){
  if(offset+8>data.length)throw Error('Truncated GLB chunk');
  const length=data.readUInt32LE(offset),type=data.readUInt32LE(offset+4);offset+=8;
  if(length%4||offset+length>data.length)throw Error('Invalid GLB chunk length');
  const chunk=data.subarray(offset,offset+length);offset+=length;
  if(type===0x4e4f534a){if(json)throw Error('Duplicate JSON chunk');json=JSON.parse(chunk.toString('utf8'));}
  else if(type===0x004e4942){if(bin)throw Error('Duplicate BIN chunk');bin=chunk;}
 }
 if(!json||!bin||json.buffers?.length!==1||json.buffers[0].uri||json.buffers[0].byteLength>bin.length)throw Error('Expected embedded GLB buffer');
 function view(index:number):Buffer {
  const v=json.bufferViews?.[index];
  if(!v||v.buffer!==0||!Number.isInteger(v.byteLength)||v.byteLength<0||!Number.isInteger(v.byteOffset??0)||(v.byteOffset??0)<0||(v.byteOffset??0)+v.byteLength>json.buffers[0].byteLength)throw Error('Invalid buffer view');
  return bin!.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
 }
 function accessor(index:number,kind:'position'|'index'){
  const a=json.accessors?.[index],widths:Record<number,number>={5121:1,5123:2,5125:4,5126:4};
  if(!a||a.sparse||!Number.isInteger(a.count)||a.count<0||!widths[a.componentType]||a.type!==(kind==='position'?'VEC3':'SCALAR')||(kind==='position'?a.componentType!==5126:a.componentType===5126))throw Error('Unsupported accessor');
  const bytes=view(a.bufferView),elementBytes=widths[a.componentType]*(kind==='position'?3:1),stride=json.bufferViews[a.bufferView].byteStride??elementBytes,offset=a.byteOffset??0;
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(stride)||stride<elementBytes||offset+(a.count?((a.count-1)*stride+elementBytes):0)>bytes.length)throw Error('Accessor exceeds buffer');
  return {count:a.count,read:(i:number)=>a.componentType===5121?bytes.readUInt8(offset+i*stride):a.componentType===5123?bytes.readUInt16LE(offset+i*stride):bytes.readUInt32LE(offset+i*stride)};
 }
 let triangles=0;const materials=new Set<number>();
 for(const node of json.nodes??[]){
  if(node.mesh===undefined)continue;
  const mesh=json.meshes?.[node.mesh];if(!mesh)throw Error('Missing mesh');
  for(const primitive of mesh.primitives){
   if((primitive.mode??4)!==4||primitive.extensions)throw Error('Only uncompressed triangles supported');
   const position=accessor(primitive.attributes?.POSITION,'position');
   let count=position.count;
   if(primitive.indices!==undefined){const indices=accessor(primitive.indices,'index');count=indices.count;for(let i=0;i<count;i++)if(indices.read(i)>=position.count)throw Error('Index exceeds vertex count');}
   if(count%3)throw Error('Incomplete triangle');triangles+=count/3;
   if(primitive.material!==undefined){if(!json.materials?.[primitive.material])throw Error('Missing material');materials.add(primitive.material);}else materials.add(-1);
  }
 }
 const textures:{width:number;height:number}[]=(json.images??[]).map((image:any)=>{
  if(image.uri||image.mimeType!=='image/png')throw Error('Budget checker requires embedded PNG textures');
  const png=view(image.bufferView);
  if(png.length<33||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG header');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);if(!width||!height)throw Error('Invalid texture dimensions');
  return {width,height};
 });
 return {triangles,materials:materials.size,textures};
}

export function assertAssetBudget(id:string,actual:ReturnType<typeof inspectGlb>,declared:{triangles:number;materials:number}){
 const limits:Record<string,number>={ruler_cube:200,wall:500,doorway:500,stairs:600,observatory_pillar:1000,npc:1200,facility:3000,thermometer:1000,archive_desk:3000,house_terrace:1500,house_tower:1500,house_terrace_ruined:1500,house_tower_ruined:1500,ground_slab:200,ground_band:200,ground_platform:200,wall_corner:500,railing:600,stone_cluster:250,supply_crate:250,route_flag:250};
 if(!(id in limits))throw Error(`No explicit budget for ${id}`);
 if(actual.triangles!==declared.triangles||actual.materials!==declared.materials)throw Error(`Manifest geometry counts differ: ${id}`);
 if(actual.triangles>limits[id]||actual.materials>1)throw Error(`Geometry budget exceeded: ${id}`);
 const edge=id==='npc'?128:512;
 if(actual.textures.some(texture=>texture.width>edge||texture.height>edge))throw Error(`Texture budget exceeded: ${id}`);
}
