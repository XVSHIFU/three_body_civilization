import {deflateSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
export const palette=[0xafa38c,0x4f6267,0xbc9658];
function crc32(bytes:Buffer){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type:string,data:Buffer){const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);}
/** Code-defined solid swatches: source material data, not a painted image. */
export function palettePng(size:number){
 const raw=Buffer.alloc(size*(1+size*4));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const color=palette[Math.min(2,Math.floor(x/size*3))],offset=y*(1+size*4)+1+x*4;
  raw[offset]=color>>>16;raw[offset+1]=(color>>>8)&255;raw[offset+2]=color&255;raw[offset+3]=255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
export function paletteUv(color:number,size:number){const index=palette.indexOf(color);if(index<0)throw Error('Unknown source palette color');const center=(index+.5)*size/3;return [center-1,size/2-1,center+1,size/2+1];}
export function sourceTexture(id:string,size:number){return {name:`${id}_palette`,id:'0',uuid:randomUUID(),path:'',folder:'',namespace:'',width:size,height:size,uv_width:size,uv_height:size,particle:false,use_as_default:false,layers_enabled:false,file_format:'png',render_mode:'default',render_sides:'auto',wrap_mode:'limited',pbr_channel:'color',visible:true,internal:true,saved:true,source:`data:image/png;base64,${palettePng(size).toString('base64')}`};}
