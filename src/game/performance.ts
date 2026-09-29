export interface FrameSample {milliseconds:number;calls:number;triangles:number;tick:number;position:number[]}
export class PerformanceCapture {
 private samples:FrameSample[]=[];
 private seconds=0;
 private route:{activeSeconds:number;tick:number;position:number[]}[]=[];
 private nextRouteSecond=0;
 active=false;
 start(){this.samples=[];this.seconds=0;this.route=[];this.nextRouteSecond=0;this.active=true;}
 add(sample:FrameSample){
  if(!this.active||!Number.isFinite(sample.milliseconds)||sample.milliseconds<=0)return;
  this.samples.push({...sample,position:[...sample.position]});this.seconds+=sample.milliseconds/1000;
  if(this.seconds>=this.nextRouteSecond){this.route.push({activeSeconds:this.seconds,tick:sample.tick,position:[...sample.position]});this.nextRouteSecond=Math.floor(this.seconds)+1;}
  if(this.seconds>=90)this.active=false;
 }
 report(){
  const times=this.samples.map(s=>s.milliseconds).sort((a,b)=>a-b),count=times.length;
  return {complete:this.seconds>=90,activeSeconds:this.seconds,frames:count,
   averageFps:this.seconds?count/this.seconds:null,p95FrameMs:count?times[Math.ceil(count*.95)-1]:null,
   maxFrameMs:count?times[count-1]:null,peakCalls:count?this.samples.reduce((peak,s)=>Math.max(peak,s.calls),0):null,
   peakTriangles:count?this.samples.reduce((peak,s)=>Math.max(peak,s.triangles),0):null,
   route:this.route.map(point=>({...point,position:[...point.position]})),
   frameIntervalsMs:this.samples.map(s=>s.milliseconds),
   frameCalls:this.samples.map(s=>s.calls),frameTriangles:this.samples.map(s=>s.triangles),
   routeSampling:'First frame and first available frame at each elapsed active second; long frames leave gaps, no interpolated positions.'};
 }
}
