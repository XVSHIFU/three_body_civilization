import {it,expect} from 'vitest';
import * as THREE from 'three';
import {NpcAnimationCadence} from '../src/renderer/npc-cadence';

it('samples distant animation at 10Hz while preserving elapsed time and pose',()=>{
 const clip=new THREE.AnimationClip('idle',2,[new THREE.NumberKeyframeTrack('.position[x]',[0,1,2],[0,1,0])]);
 const nearRoot=new THREE.Object3D(),farRoot=new THREE.Object3D(),near=new THREE.AnimationMixer(nearRoot),far=new THREE.AnimationMixer(farRoot),cadence=new NpcAnimationCadence();
 near.clipAction(clip).play();far.clipAction(clip).play();let updates=0;
 for(let i=0;i<120;i++){near.update(1/60);const dt=cadence.take(1/60,60);if(dt){far.update(dt);updates++;expect(farRoot.position.x).toBeCloseTo(nearRoot.position.x,10);}}
 expect(updates).toBe(20);expect(far.time).toBeCloseTo(near.time,10);
});

it('updates urgent states immediately and avoids oscillation at the distance boundary',()=>{
 const cadence=new NpcAnimationCadence();
 expect(cadence.take(1/60,45)).toBe(0);
 expect(cadence.take(1/60,38)).toBe(0);
 expect(cadence.take(0,38,true)).toBeCloseTo(2/60);
 expect(cadence.take(1/60,38)).toBe(0);
 expect(cadence.take(1/60,30)).toBeCloseTo(2/60);
 expect(cadence.take(1/60,38)).toBeCloseTo(1/60);
 expect(cadence.take(1/60,70,true)).toBeCloseTo(1/60);
});
