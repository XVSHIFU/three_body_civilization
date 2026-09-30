import {beforeAll,expect,it} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {CourtyardSession} from '../src/courtyard/session';
import {courtyardCollisions} from '../src/courtyard/scene';
import {PlayerController} from '../src/player/controller';

it('returns directly from exploration reading, but preserves pause-origin and focus loss',()=>{
 const s=new CourtyardSession();s.ready();expect(s.clock.paused).toBe(true);s.locked();
 s.open('plaque');s.interrupt('pointerUnlocked');expect(s.canReturn).toBe(true);s.locked();expect(s.clock.paused).toBe(false);
 s.escape();s.open('journal');expect(s.canReturn).toBe(false);
 s.locked();s.open('instrument');s.interrupt('focusLost');expect(s.canReturn).toBe(false);
 s.escape();s.open('settings');expect(s.settingsOrigin).toBe('pause');expect(s.clock.paused).toBe(true);
 s.clock.pause('contextLost');expect(s.locked()).toBe(false);expect(s.clock.paused).toBe(true);
 const failed=new CourtyardSession();failed.open('error');failed.escape();expect(failed.panel).toBe('error');expect(failed.locked()).toBe(false);
});

it('freezes time through repeated reading and Esc cycles without catching up',()=>{
 const s=new CourtyardSession();s.ready();s.locked();s.clock.advance(1/60,()=>{});
 for(let i=0;i<5;i++){s.open('journal');s.clock.advance(2,()=>{throw Error('time advanced while reading');});s.escape();s.clock.advance(2,()=>{throw Error('time advanced while paused');});s.locked();}
 expect(s.clock.tick).toBe(1);s.clock.advance(1/60,()=>{});expect(s.clock.tick).toBe(2);
});

beforeAll(async()=>{await RAPIER.init();});
it('walks all eight courtyard treads up and down, while perimeter and instrument stop the capsule',()=>{
 const w=new RAPIER.World({x:0,y:-9.81,z:0});
 for(const c of courtyardCollisions())w.createCollider(RAPIER.ColliderDesc.cuboid(c.size[0]/2,c.size[1]/2,c.size[2]/2).setTranslation(...c.position));
 const p=new PlayerController(w,{x:4,y:.92,z:3});w.step();
 const walk=(x:number,z:number,steps:number)=>{for(let i=0;i<steps;i++){p.move(x,z,1/60);w.step();}};
 walk(0,-3.1,200);expect(p.body.translation().z).toBeLessThan(-3);expect(p.body.translation().y).toBeGreaterThan(2.4);
 walk(0,-3.1,120);expect(p.body.translation().z).toBeGreaterThan(-4.61);
 walk(0,3.1,180);expect(p.body.translation().z).toBeGreaterThan(2);expect(p.body.translation().y).toBeLessThan(1);
 p.setPosition(12,.92,8);w.step();walk(3.1,0,120);expect(p.body.translation().x).toBeLessThan(13.21);expect(p.grounded).toBe(true);
 p.dispose();w.free();
});

