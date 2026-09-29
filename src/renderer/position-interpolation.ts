type Position={x:number;y:number;z:number};
/** Render-only snapshots. Never changes the authoritative physics position. */
export class PositionInterpolation {
 private previous:Position={x:0,y:0,z:0};
 private current:Position={x:0,y:0,z:0};
 reset(position:Position){this.previous={...position};this.current={...position};}
 record(position:Position){this.previous=this.current;this.current={...position};}
 at(alpha:number):Position {
  const t=Math.max(0,Math.min(1,alpha));
  return {x:this.previous.x+(this.current.x-this.previous.x)*t,y:this.previous.y+(this.current.y-this.previous.y)*t,z:this.previous.z+(this.current.z-this.previous.z)*t};
 }
}
