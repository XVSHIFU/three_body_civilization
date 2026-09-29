import type {Scenario} from './core';
/** Full initial conditions, not a seed masquerading as a reproducible orbit. */
export const scenario:Scenario={
 id:'validation-001',version:1,integratorVersion:'verlet-1',h:0.002,timeScale:0.01,
 stars:[
  {id:'s1',mass:0.01,luminosity:8,position:[-2,0,0],velocity:[0,0,-0.03535533905932738]},
  {id:'s2',mass:0.01,luminosity:8,position:[2,0,0],velocity:[0,0,0.03535533905932738]},
  {id:'s3',mass:0.02,luminosity:30,position:[0,0,-10],velocity:[0.04472135955,0,0]}
 ],
 planet:{id:'p',mass:0,luminosity:0,position:[0,0,5],velocity:[0.04,0,0]},latitude:0.06,rotation:2.8,spin:0.19,
 climate:{base:28,gain:22,referenceFlux:0.012,tau:45,warning:39,danger:54,cityLimit:105,facilityLimit:8},duration:780
};
/** Same orbit and thresholds; compress world evolution, not player movement or the 12 s preservation action. */
export const compressedScenario:Scenario={
 ...structuredClone(scenario),id:'compressed-001',timeScale:scenario.timeScale*3.4,
 climate:{...scenario.climate,tau:scenario.climate.tau/3.4,cityLimit:scenario.climate.cityLimit/3.4},duration:230
};
