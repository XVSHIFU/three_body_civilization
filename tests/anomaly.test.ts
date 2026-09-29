import {it,expect} from 'vitest';
import {AnomalySignal} from '../src/gameplay/anomaly';
import {GameClock} from '../src/game/clock';

it('signals only once after a local observation, freezes its caption on pause, and restores without another bell',()=>{
 const clock=new GameClock(),signal=new AnomalySignal();clock.clear('loading');clock.clear('pointerUnlocked');
 expect(signal.update(clock.tick,false)).toBe(false);
 expect(signal.firstTick).toBeNull();
 clock.advance(1/60,()=>expect(signal.update(clock.tick,true)).toBe(true));
 expect(signal.captionVisible(clock.tick)).toBe(true);
 clock.pause('menu');clock.advance(600,()=>{throw Error('paused update');});
 expect(signal.captionVisible(clock.tick)).toBe(true);
 const resumed=new AnomalySignal(JSON.parse(JSON.stringify({tick:signal.firstTick})).tick);
 expect(resumed.update(clock.tick,true)).toBe(false);
 expect(resumed.update(clock.tick+1,false)).toBe(false);
 expect(resumed.update(clock.tick+2,true)).toBe(false);
 expect(resumed.captionVisible(clock.tick+359)).toBe(true);
 expect(resumed.captionVisible(clock.tick+360)).toBe(false);
 expect(new AnomalySignal().update(0,true)).toBe(true);
});
