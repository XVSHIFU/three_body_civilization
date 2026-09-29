import {initialState, step, surfaceFlux, climateStep, type CelestialState, type Scenario} from './core';
import {environmentSky} from './sky';

/** Shared by the live fixed-tick world and the offline scenario screening. */
export interface EnvironmentState {
  celestial: CelestialState;
  celestialAccumulator: number;
  temperature: number;
  heatLoad: number;
  dangerDuration: number;
  warning: boolean;
}
export function initialEnvironment(s: Scenario): EnvironmentState {
  return {celestial: initialState(s), celestialAccumulator: 0, temperature: s.climate.base,
    heatLoad: 0, dangerDuration: 0, warning: false};
}
export function advanceEnvironment(state: EnvironmentState, dt: number, s: Scenario): EnvironmentState {
  let celestial = state.celestial;
  let celestialAccumulator = state.celestialAccumulator + dt * s.timeScale;
  while (celestialAccumulator >= s.h) {
    celestial = step(celestial, s.h);
    celestialAccumulator -= s.h;
  }
  const flux = surfaceFlux(environmentSky(celestial,celestialAccumulator,s));
  const temperature = climateStep(state.temperature, flux, dt, s.climate);
  const warning = temperature >= s.climate.warning ||
    (state.warning && temperature >= s.climate.warning - 3);
  const dangerDuration = temperature >= s.climate.danger
    ? state.dangerDuration + dt : Math.max(0, state.dangerDuration - dt);
  return {celestial, celestialAccumulator, temperature, warning, dangerDuration,
    heatLoad: flux / s.climate.referenceFlux};
}
