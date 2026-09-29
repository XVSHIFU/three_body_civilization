import RAPIER from '@dimforge/rapier3d-compat';
import {avoidPlayer,type GroundPoint} from './avoidance';

const body=new RAPIER.Capsule(.475,.4);
const rotation={x:0,y:0,z:0,w:1};

/** Fixed ground routes only. Sweep a body volume; slide at walls, never teleport. */
export function moveNpc(world:RAPIER.World,from:GroundPoint,desired:GroundPoint,player:GroundPoint,dt:number,neighbours:GroundPoint[]=[]):GroundPoint {
 let avoided=desired;
 for(const neighbour of neighbours)avoided=avoidPlayer(from,avoided,neighbour,dt,.85);
 avoided=avoidPlayer(from,avoided,player,dt);
 const position={x:from.x,y:.9,z:from.z};
 let remaining={x:avoided.x-from.x,y:0,z:avoided.z-from.z};
 for(let attempt=0;attempt<3;attempt++){
  if(Math.hypot(remaining.x,remaining.z)<1e-7)break;
  const hit=world.castShape(position,rotation,remaining,body,.01,1,false,RAPIER.QueryFilterFlags.ONLY_FIXED);
  // Stay just outside the query margin; exact contact can re-hit at t=0 on tangential casts.
  const fraction=hit?Math.max(0,Math.min(1,hit.time_of_impact)-.001/Math.hypot(remaining.x,remaining.z)):1;
  position.x+=remaining.x*fraction;position.z+=remaining.z*fraction;
  if(!hit)break;
  remaining={x:remaining.x*(1-fraction),y:0,z:remaining.z*(1-fraction)};
  const normal=hit.normal1,length=Math.hypot(normal.x,normal.z);
  if(length<.5)break;
  const nx=normal.x/length,nz=normal.z/length,towards=remaining.x*nx+remaining.z*nz;
  if(towards<0){remaining.x-=nx*towards;remaining.z-=nz*towards;}else break;
 }
 // Sliding must not undo the player's clearance. An already-overlapping NPC may yield.
 const oldDistance=Math.hypot(from.x-player.x,from.z-player.z),newDistance=Math.hypot(position.x-player.x,position.z-player.z);
 if(newDistance<Math.min(.8,oldDistance)-1e-7)return from;
 for(const neighbour of neighbours){
  const before=Math.hypot(from.x-neighbour.x,from.z-neighbour.z),after=Math.hypot(position.x-neighbour.x,position.z-neighbour.z);
  if(after<Math.min(.85,before)-1e-7)return from;
 }
 return {x:position.x,z:position.z};
}

export function shelterRoute(index:number):GroundPoint[]{
 return [{x:-14,z:-16},{x:-24,z:-23},{x:-24,z:-27},{x:-24+(index%3-1)*1.2,z:-29-Math.floor(index/3)*1.2}];
}

/** The doorway approach must align tightly before entering its 2m opening. */
export function shelterWaypointReached(distance:number,waypoint:number):boolean {return distance<(waypoint===1||waypoint>=3?.15:.65);}
