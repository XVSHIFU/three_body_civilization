export type Quality='low'|'standard'|'high';
const scales=[1,.85,.7,.55];
export const pixelBudgets:Record<Quality,number>={low:800000,standard:1600000,high:2100000};

/** One-second p95 windows, slow recovery, and active-time-only cooldowns. */
export class AdaptiveResolution {
 private level=0;
 private elapsed=0;
 private lastChange=0;
 private windowSeconds=0;
 private frames:number[]=[];
 private overloaded=0;
 private stable=0;
 readonly changes:{activeSeconds:number;scale:number;reason:'over-budget'|'stable'}[]=[];
 constructor(readonly quality:Quality){}
 get scale(){return scales[this.level];}
 interrupt(){this.windowSeconds=0;this.frames=[];this.overloaded=0;this.stable=0;}
 sample(milliseconds:number):boolean {
  if(!Number.isFinite(milliseconds)||milliseconds<=0)return false;
  // A lone long stall is evidence, but cannot supply several seconds of sustained load.
  const seconds=Math.min(milliseconds/1000,.25);
  this.elapsed+=seconds;this.windowSeconds+=seconds;this.frames.push(milliseconds);
  if(this.windowSeconds<1)return false;
  const windowSeconds=this.windowSeconds,sorted=this.frames.sort((a,b)=>a-b);
  const p95=sorted[Math.ceil(sorted.length*.95)-1],budget=this.quality==='low'?36:20;
  this.windowSeconds=0;this.frames=[];
  this.overloaded=p95>budget?this.overloaded+windowSeconds:0;
  this.stable=p95<=budget*.95?this.stable+windowSeconds:0;
  if(this.elapsed-this.lastChange<5)return false;
  let reason:'over-budget'|'stable'|null=null;
  if(this.overloaded>=3&&this.level<scales.length-1){this.level++;reason='over-budget';}
  else if(this.stable>=30&&this.level>0){this.level--;reason='stable';}
  if(!reason)return false;
  this.lastChange=this.elapsed;this.overloaded=0;this.stable=0;
  this.changes.push({activeSeconds:this.elapsed,scale:this.scale,reason});
  if(this.changes.length>120)this.changes.shift();
  return true;
 }
}

export function renderRatio(width:number,height:number,dpr:number,quality:Quality,scale=1){
 return Math.min(dpr,Math.sqrt(pixelBudgets[quality]/Math.max(1,width*height)))*scale;
}
