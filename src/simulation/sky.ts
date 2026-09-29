import {observe,step,type CelestialState,type Scenario,type SunView,type Vec3} from './core';

const nextStates=new WeakMap<CelestialState,{h:number;state:CelestialState}>();
const lerp=(a:Vec3,b:Vec3,t:number):Vec3=>a.map((value,i)=>value+(b[i]-value)*t) as Vec3;

/** Evaluate the shared fixed-tick sky inside the integrator interval, without changing saved state. */
export function environmentSky(state:CelestialState,remainder:number,scenario:Scenario):SunView[]{
 if(remainder===0)return observe(state,scenario);
 if(!Number.isFinite(remainder)||remainder<0||remainder>=scenario.h)throw Error('天空积分余量无效');
 let next=nextStates.get(state);
 if(!next||next.h!==scenario.h){next={h:scenario.h,state:step(state,scenario.h)};nextStates.set(state,next);}
 const t=remainder/scenario.h;
 const blend=(body:CelestialState['planet'],other:CelestialState['planet'])=>({...body,position:lerp(body.position,other.position,t)});
 return observe({time:state.time+remainder,stars:state.stars.map((body,i)=>blend(body,next!.state.stars[i])),planet:blend(state.planet,next.state.planet)},scenario);
}

/** Interpolate each real source independently; never blend two suns into an invented light. */
export function interpolateSky(previous:SunView[],current:SunView[],alpha:number):SunView[]{
 const t=Math.max(0,Math.min(1,alpha));
 return current.map((sun,i)=>{
  const before=previous[i];if(!before||before.id!==sun.id)return {...sun,direction:[...sun.direction]};
  const direction=lerp(before.direction,sun.direction,t),length=Math.hypot(...direction);
  if(length<1e-12)return {...sun,direction:[...sun.direction]};
  const normalized=direction.map(value=>value/length) as Vec3;
  return {...sun,direction:normalized,aboveHorizon:normalized[1]>0,irradiance:before.irradiance+(sun.irradiance-before.irradiance)*t};
 });
}
