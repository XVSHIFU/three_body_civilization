/** Accumulate simulation time while a distant animation is sampled less often. */
export class NpcAnimationCadence {
 private pending=0;
 private distant=false;
 take(dt:number,distance:number,urgent=false):number {
  this.pending+=dt;
  if(distance>40)this.distant=true;else if(distance<32)this.distant=false;
  if(!urgent&&this.distant&&this.pending<.1-1e-10)return 0;
  const elapsed=this.pending;this.pending=0;return elapsed;
 }
}
