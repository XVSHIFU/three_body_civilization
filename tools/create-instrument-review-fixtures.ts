import {readFileSync,writeFileSync} from 'node:fs';
import {buildIdentity} from './build-identity';
const identity=buildIdentity();
for(const [id,position,pitch,yaw] of [['thermometer',[-7.8,.9,-4.3],-.2,0],['archive_desk',[-26,.9,-9],-.25,0],['house_terrace',[-38,.9,65],.05,.6],['house_tower',[35,.9,60],.05,.6],['observatory_rails',[24,12.9,-33],-.15,.6]] as const){
 const archive=JSON.parse(readFileSync('reports/fixtures/legacy-checkpoint-review.json','utf8'));
 archive.buildId=identity.buildId;archive.observations=[];archive.hypothesis={proposed:false,evidenceIds:[],status:'tentative'};archive.settings.fontScale=1;archive.settings.theme='b';
 Object.assign(archive.checkpoint,{scenarioId:'validation-001',runtimeId:identity.runtimeId,position,yaw,pitch,motion:{verticalSpeed:0,grounded:true,safePosition:position},npcs:[[-5,-3],[-22,-23],[6,1],[10,-10],[-16,5],[2,-17]].map(([x,z],index)=>({position:[x,0,z],yaw:0,state:'idle',waypoint:index===1?1:0,preserveElapsed:0}))});
 writeFileSync(`reports/fixtures/${id}-scene-review.json`,JSON.stringify(archive,null,2));
}
