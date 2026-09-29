import {inflateSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Node has no ImageBitmap. Decode this project's embedded non-interlaced RGBA8 palette PNGs for
 * geometry/animation tests; browser image decoding and GPU uploads are verified separately. */
export function embeddedModelLoader(){return new GLTFLoader().register(parser=>({
 name:'TEST_NODE_PALETTE_PNG',
 async loadTexture(index:number){
  const image=parser.json.images[parser.json.textures[index].source];
  if(image.mimeType!=='image/png'||image.uri)throw Error('Test loader requires embedded PNG');
  const png=Buffer.from(await parser.getDependency('bufferView',image.bufferView));
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png[24]!==8||png[25]!==6||png[28]!==0)throw Error('Unsupported test PNG');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20),chunks:Buffer[]=[];
  if(width>512||height>512||width===0||height===0)throw Error('Unexpected test palette dimensions');
  for(let at=8;at+12<=png.length;){const size=png.readUInt32BE(at),kind=png.toString('ascii',at+4,at+8);if(at+size+12>png.length)throw Error('Truncated PNG chunk');if(kind==='IDAT')chunks.push(png.subarray(at+8,at+8+size));at+=size+12;if(kind==='IEND')break;}
  const raw=inflateSync(Buffer.concat(chunks)),row=width*4,pixels=new Uint8Array(width*height*4);
  if(raw.length!==(row+1)*height)throw Error('Wrong decoded palette length');
  for(let y=0;y<height;y++){
   const filter=raw[y*(row+1)];if(filter>4)throw Error('Unsupported PNG filter');
   for(let x=0;x<row;x++){
    const at=y*row+x,a=x>=4?pixels[at-4]:0,b=y?pixels[at-row]:0,c=y&&x>=4?pixels[at-row-4]:0;
    const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c),paeth=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
    const predictor=[0,a,b,Math.floor((a+b)/2),paeth][filter];pixels[at]=(raw[y*(row+1)+1+x]+predictor)&255;
   }
  }
  const texture=new THREE.DataTexture(pixels,width,height);texture.flipY=false;texture.needsUpdate=true;return texture;
 }
}));}
