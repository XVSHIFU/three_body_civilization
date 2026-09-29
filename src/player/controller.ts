import RAPIER from '@dimforge/rapier3d-compat';
export class PlayerController {
 readonly body:RAPIER.RigidBody;readonly collider:RAPIER.Collider;readonly controller:RAPIER.KinematicCharacterController;
 verticalSpeed=0;grounded=false;
 constructor(readonly world:RAPIER.World,position={x:0,y:0.9,z:64}){
  this.body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x,position.y,position.z));
  // Capsule full height = 2 * half-height + 2 * radius = 1.75m.
  this.collider=world.createCollider(RAPIER.ColliderDesc.capsule(.575,.3),this.body);
  this.controller=world.createCharacterController(.01);this.controller.enableAutostep(.3,.2,false);this.controller.enableSnapToGround(.2);this.controller.setMaxSlopeClimbAngle(40*Math.PI/180);this.controller.setMinSlopeSlideAngle(41*Math.PI/180);
 }
 move(x:number,z:number,dt:number){this.verticalSpeed=this.grounded?-.5:Math.max(-30,this.verticalSpeed-9.81*dt);this.controller.computeColliderMovement(this.collider,{x:x*dt,y:this.verticalSpeed*dt,z:z*dt});const m=this.controller.computedMovement(),p=this.body.translation();this.body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});this.grounded=this.controller.computedGrounded();}
 setPosition(x:number,y:number,z:number){this.body.setTranslation({x,y,z},true);this.body.setNextKinematicTranslation({x,y,z});this.verticalSpeed=0;}
 get eye(){const p=this.body.translation();return{x:p.x,y:p.y+.745,z:p.z};}
 dispose(){this.world.removeCharacterController(this.controller);this.world.removeRigidBody(this.body);}
}
