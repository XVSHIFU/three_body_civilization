/** A single real light owns the shadow; transitions never interpolate directions. */
export class ShadowSelector {
  source=-1;
  strength=0;
  private pending=-1;
  private switching=false;
  private initialized=false;
  update(power:number[],dt:number){
    let candidate=-1;
    for(let i=0;i<power.length;i++)if(power[i]>1e-8&&(candidate<0||power[i]>power[candidate]))candidate=i;
    // The first frame is often paused (startup or checkpoint restore). There is
    // no previous shadow to fade from, and simulation time may never advance.
    if(!this.initialized){this.initialized=true;this.source=candidate;this.strength=candidate<0?0:1;return {source:this.source,strength:this.strength};}
    if(this.source<0&&!this.switching){this.source=candidate;}
    const current=this.source<0?0:power[this.source];
    if(!this.switching&&candidate!==this.source&&(current<=1e-8||candidate>=0&&power[candidate]>current*1.15)){
      this.pending=candidate;this.switching=true;
    }
    if(this.switching){
      this.strength=Math.max(0,this.strength-dt/.4);
      if(this.strength===0){this.source=this.pending;this.switching=false;}
    }else this.strength=this.source<0?0:Math.min(1,this.strength+dt/.4);
    return {source:this.source,strength:this.strength};
  }
}
