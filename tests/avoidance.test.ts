import {expect,it} from 'vitest';
import {avoidPlayer} from '../src/gameplay/avoidance';
it('keeps approaching NPC steps outside the player and bounds yielding displacement',()=>{
 let p={x:0,z:2};const player={x:0,z:0};
 for(let i=0;i<300;i++){
  const length=Math.hypot(p.x,p.z+2),desired={x:p.x-p.x/length/30,z:p.z-(p.z+2)/length/30};
  p=avoidPlayer(p,desired,player,1/60);expect(Math.hypot(p.x,p.z)).toBeGreaterThanOrEqual(.8-1e-10);
 }
 const overlapping=avoidPlayer({x:0,z:0},{x:0,z:-.03},player,1/60);
 expect(Math.hypot(overlapping.x,overlapping.z)).toBeCloseTo(2/60);
});
