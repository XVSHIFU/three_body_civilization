/** One signal per civilization; elapsed time is simulation ticks, so pauses freeze the caption. */
export class AnomalySignal {
 constructor(public firstTick:number|null=null){}
 update(tick:number,locallyObserved:boolean):boolean {
  if(this.firstTick!==null||!locallyObserved)return false;
  this.firstTick=tick;return true;
 }
 captionVisible(tick:number):boolean {return this.firstTick!==null&&tick>=this.firstTick&&tick-this.firstTick<6*60;}
}
