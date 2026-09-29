import {it,expect} from 'vitest';
import * as THREE from 'three';
import {interactionTarget} from '../src/renderer/interaction-ray';
import {interactionBehavior,type InteractionContext} from '../src/gameplay/interaction';
import type {Interactable} from '../src/renderer/world';
import {disposeResources} from '../src/renderer/dispose-resources';

it('resolves current range, walls, moved actors and hidden ancestors without relying on the last hint',()=>{
 const scene=new THREE.Scene(),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.5,1,.5),new THREE.MeshBasicMaterial());
 group.position.z=-2;group.add(mesh);group.userData.targetId='teacher';scene.add(group);
 const target:Interactable={stableId:'teacher',kind:'teacher',displayName:'观察者',object:group,...interactionBehavior('teacher','teacher',()=>true)};
 const context:InteractionContext={ended:false,preservationPhase:'idle',dispatch:()=>{}},ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,-1),0,2.5);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2,.2),new THREE.MeshBasicMaterial());wall.position.z=-1;scene.add(wall);scene.updateMatrixWorld(true);
 expect(interactionTarget(ray,[],[target],context)).toBe(target);
 expect(interactionTarget(ray,[wall],[target],context)).toBeNull();
 wall.visible=false;expect(interactionTarget(ray,[wall],[target],context)).toBe(target);
 group.position.z=-4;expect(interactionTarget(ray,[],[target],context)).toBeNull();
 group.position.z=-2;group.visible=false;expect(interactionTarget(ray,[],[target],context)).toBeNull();
 group.visible=true;expect(interactionTarget(ray,[],[target],{...context,ended:true})).toBeNull();
 ray.set(new THREE.Vector3(),new THREE.Vector3(1,0,0));expect(interactionTarget(ray,[],[target],context)).toBeNull();
 disposeResources([scene]);
});
