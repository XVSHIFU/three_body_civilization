/** Dimensionless celestial coordinates. Ground metres never enter this module. */
export type Vec3 = [number, number, number];
export interface Body { id: string; mass: number; luminosity: number; position: Vec3; velocity: Vec3 }
export interface Scenario { id: string; version: number; integratorVersion: string; h: number; timeScale: number; stars: Body[]; planet: Body; latitude: number; rotation: number; spin: number; climate: { base: number; gain: number; referenceFlux: number; tau: number; warning: number; danger: number; cityLimit: number; facilityLimit: number }; duration: number }
export interface CelestialState { time: number; stars: Body[]; planet: Body }
export interface SunView { id: string; direction: Vec3; aboveHorizon: boolean; irradiance: number }
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0]*k,a[1]*k,a[2]*k];
export const sub = (a: Vec3, b: Vec3): Vec3 => add(a,scale(b,-1));
export const dot = (a: Vec3, b: Vec3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const length = (a: Vec3) => Math.sqrt(dot(a,a));
export function initialState(s: Scenario): CelestialState { return structuredClone({ time:0,stars:s.stars,planet:s.planet }); }
function acceleration(position: Vec3, stars: Body[], exclude?: string): Vec3 {
  let a: Vec3=[0,0,0];
  for (const star of stars) {
    if(star.id===exclude) continue;
    const d=sub(star.position,position), r=length(d);
    if(!Number.isFinite(r)||r<0.025) throw new Error('场景被拒绝：天体近距离相遇或数值异常');
    a=add(a,scale(d,star.mass/(r*r*r)));
  }
  return a;
}
/** Velocity Verlet; massless planet responds to stars without backreaction. */
export function step(state: CelestialState,h:number): CelestialState {
  if(!Number.isFinite(h)||h<=0) throw new Error('积分步长必须为正有限数');
  const a=state.stars.map(b=>acceleration(b.position,state.stars,b.id));
  const pa=acceleration(state.planet.position,state.stars);
  const stars=state.stars.map((b,i)=>({...b,position:add(b.position,add(scale(b.velocity,h),scale(a[i],h*h/2)))}));
  const pp=add(state.planet.position,add(scale(state.planet.velocity,h),scale(pa,h*h/2)));
  stars.forEach((b,i)=>{b.velocity=add(b.velocity,scale(add(a[i],acceleration(b.position,stars,b.id)),h/2));});
  const planet={...state.planet,position:pp,velocity:add(state.planet.velocity,scale(add(pa,acceleration(pp,stars)),h/2))};
  if([...stars,planet].some(b=>[...b.position,...b.velocity].some(v=>!Number.isFinite(v)))) throw new Error('天体数值发散');
  return {time:state.time+h,stars,planet};
}
export function stellarEnergy(state:CelestialState):number {
  let e=0;state.stars.forEach((b,i)=>{e+=b.mass*dot(b.velocity,b.velocity)/2;for(let j=0;j<i;j++)e-=b.mass*state.stars[j].mass/length(sub(b.position,state.stars[j].position));});return e;
}
export function observe(state:CelestialState,s:Scenario):SunView[] {
  const angle=s.rotation+state.time*s.spin, c=Math.cos(angle),sn=Math.sin(angle),lat=s.latitude;
  const east:Vec3=[-sn,0,c], up:Vec3=[Math.cos(lat)*c,Math.sin(lat),Math.cos(lat)*sn],north:Vec3=[-Math.sin(lat)*c,Math.cos(lat),-Math.sin(lat)*sn];
  return state.stars.map(b=>{const d=sub(b.position,state.planet.position),r=length(d),n=scale(d,1/r);const direction:Vec3=[dot(n,east),dot(n,up),dot(n,north)];return{id:b.id,direction,aboveHorizon:direction[1]>0,irradiance:b.luminosity/(4*Math.PI*r*r)};});
}
export const surfaceFlux=(suns:SunView[])=>suns.reduce((n,s)=>n+s.irradiance*Math.max(0,s.direction[1]),0);
export function climateStep(temperature:number,flux:number,dt:number,c:Scenario['climate']) { const equilibrium=c.base+c.gain*(flux/c.referenceFlux-1); return temperature+(equilibrium-temperature)*(1-Math.exp(-dt/c.tau)); }
