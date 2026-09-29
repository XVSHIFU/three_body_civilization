import {describe,it,expect} from 'vitest';
import {GameClock} from '../src/game/clock';
import {PositionInterpolation} from '../src/renderer/position-interpolation';

describe('render position interpolation',()=>{
 it('smooths 120 Hz frames and retains the last two steps at 30 Hz',()=>{
  const clock=new GameClock(),render=new PositionInterpolation(),body={x:0,y:1,z:0};
  clock.clear('loading');clock.clear('pointerUnlocked');render.reset(body);
  const update=()=>{body.x++;render.record(body);};
  clock.advance(1/60,update);
  expect(render.at(clock.interpolationAlpha).x).toBeCloseTo(0);
  clock.advance(1/120,update);
  expect(render.at(clock.interpolationAlpha).x).toBeCloseTo(.5);
  expect(body.x).toBe(1);
  clock.advance(1/120,update);
  expect(render.at(clock.interpolationAlpha).x).toBeCloseTo(1);
  clock.advance(1/30,update);
  expect(body.x).toBe(4);
  expect(render.at(clock.interpolationAlpha).x).toBeCloseTo(3);
 });
 it('snaps pauses and recovery without retaining an old movement path',()=>{
  const clock=new GameClock(),render=new PositionInterpolation();
  render.reset({x:0,y:0,z:0});render.record({x:10,y:0,z:0});
  clock.pause('menu');expect(render.at(clock.interpolationAlpha).x).toBe(10);
  const safe={x:20,y:2,z:3};render.reset(safe);safe.x=99;
  expect(render.at(0)).toEqual({x:20,y:2,z:3});
  expect(render.at(1)).toEqual({x:20,y:2,z:3});
 });
});
