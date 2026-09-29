export interface GroundPoint {x:number;z:number}
/** Resolve an NPC step against the player's horizontal body, without moving the player. */
export function avoidPlayer(from:GroundPoint,desired:GroundPoint,player:GroundPoint,dt:number,radius=.8):GroundPoint{
 const distance=Math.hypot(desired.x-player.x,desired.z-player.z);
 if(distance>=radius)return desired;
 const dx=from.x-player.x,dz=from.z-player.z,previousDistance=Math.hypot(dx,dz);
 if(previousDistance<radius){
  // The player may approach a stationary NPC: make it yield outwards at a bounded speed.
  const length=previousDistance||1,ux=previousDistance?dx/length:1,uz=previousDistance?dz/length:0;
  const outward=Math.min(radius-previousDistance,dt*2);
  return {x:from.x+ux*outward,z:from.z+uz*outward};
 }
 // Try a short tangential step; otherwise wait instead of penetrating the capsule.
 const stride=Math.min(dt*2,Math.hypot(desired.x-from.x,desired.z-from.z));
 const candidates=[-1,1].map(sign=>({x:from.x-sign*dz/previousDistance*stride,z:from.z+sign*dx/previousDistance*stride}));
 const valid=candidates.filter(p=>Math.hypot(p.x-player.x,p.z-player.z)>=radius);
 valid.sort((a,b)=>Math.hypot(a.x-desired.x,a.z-desired.z)-Math.hypot(b.x-desired.x,b.z-desired.z));
 return valid[0]??from;
}
