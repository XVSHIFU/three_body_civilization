/** Metres, Y up. Shared assembly recipe for rendering, collision and asset handoff. */
type Vec = [number, number, number];
export interface ObservatoryBox {position:Vec;size:Vec;material:'stone'|'dark'|'gold';target?:'high-pillar'}
export function observatoryLayout(){
 const stairs=Array.from({length:6},(_,i)=>({position:[24,i*2,-8-i*4] as Vec,scale:[1.5,1,1] as Vec}));
 const boxes:ObservatoryBox[]=[
  {position:[24,6,-36],size:[16,12,8],material:'stone'},
  {position:[24,13.5,-36],size:[.65,3,.65],material:'stone'},
  {position:[18,12.8,-32.8],size:[.8,1.6,.8],material:'gold',target:'high-pillar'},
 ];
 for(let i=0;i<48;i++){const height=(48-i)*.25;boxes.push({position:[15.75-i*.5,height/2,-34],size:[.5,height,2.5],material:'stone'});}
 for(let i=0;i<12;i++)for(const x of [22,26]){const top=1.6+i;boxes.push({position:[x,top/2,-8-i*2],size:[.35,top,2],material:'dark'});}
 const rails:{position:Vec;yaw:number}[]=[];
 // South landing x22..26 and west departure z-36..-32 stay open.
 for(let x=17;x<=31;x+=2){rails.push({position:[x,12,-39.9],yaw:0});if(x<22||x>26)rails.push({position:[x,12,-32.1],yaw:0});}
 for(const z of [-39,-37,-35,-33])rails.push({position:[31.9,12,z],yaw:Math.PI/2});
 for(const z of [-39,-37])rails.push({position:[16.1,12,z],yaw:Math.PI/2});
 return {stairs,boxes,rails};
}
