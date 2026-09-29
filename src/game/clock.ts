export type PauseReason='menu'|'hidden'|'focusLost'|'pointerUnlocked'|'loading'|'error'|'result'|'contextLost';
export class GameClock {
  readonly pauseReasons=new Set<PauseReason>(['loading','pointerUnlocked']);
  tick=0; private accumulator=0; readonly dt=1/60;
  pause(reason:PauseReason){this.pauseReasons.add(reason);this.accumulator=0;}
  clear(reason:PauseReason){this.pauseReasons.delete(reason);}
  get paused(){return this.pauseReasons.size>0;}
  get interpolationAlpha(){return this.paused?1:Math.max(0,Math.min(1,this.accumulator/this.dt));}
  advance(realDelta:number,update:(dt:number)=>void){
    if(this.paused){this.accumulator=0;return;}
    this.accumulator+=Math.min(Math.max(0,realDelta),0.1);
    while(this.accumulator+1e-10>=this.dt){this.tick++;update(this.dt);this.accumulator-=this.dt;if(this.paused){this.accumulator=0;break;}}
  }
}
