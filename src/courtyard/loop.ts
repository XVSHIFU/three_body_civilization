import type {QuestProgress} from './quest';
import {compressedScenario} from '../simulation/scenario';
import {advanceEnvironment,initialEnvironment,type EnvironmentState} from '../simulation/environment';
import {environmentSky} from '../simulation/sky';
import type {Vec3} from '../simulation/core';
import {addObservation,sample,type Observation} from '../gameplay/evidence';
import {beginPreservation,cancelPreservation,freshPreservation,outcome,stepPreservation,type Outcome,type Preservation} from '../gameplay/preservation';
import {ArchiveStore,emptyArchive,validateArchive,type Archive,type Checkpoint} from '../storage/archive';

/** Separate database: the courtyard must never migrate or overwrite prototype saves. */
export const COURTYARD_LOOP_DB='three-body-civilization:courtyard-loop:v1';
export const LOOP_VERSION='courtyard-loop-1';
export const loopScenario=compressedScenario;
const DT=1/60;
export type LoopPhase='observing'|'aftermath'|'resolved';
export interface RecoveryConditions {bodyIntact:boolean;siteIntact:boolean;environmentSuitable:boolean;waterAvailable:boolean;assistanceAvailable:boolean}
export const canRevive=(conditions:RecoveryConditions)=>conditions.bodyIntact&&conditions.siteIntact&&conditions.environmentSuitable&&conditions.waterAvailable&&conditions.assistanceAvailable;
export interface Recovery {
 tick:number;conditions:RecoveryConditions;observer:'same'|'successor'|'waiting';
}
export interface LoopMetadata {version:1;phase:LoopPhase;observerId:number;recovery:Recovery|null;quest?:QuestProgress}
export type LoopCheckpoint=Checkpoint&{courtyard:LoopMetadata};
export interface PlayerPose {position:Vec3;yaw:number;pitch:number;motion?:Checkpoint['motion']}
const initialPose:PlayerPose={position:[-3.8,.92,8.5],yaw:-.38,pitch:.1};
/** Authoring contract for the approved small space beyond the existing gateway. */
export const preservationPoint={position:[-9,1,-10.5] as Vec3,range:1.8};
export function nearPreservationPoint(position:Vec3){return position[0]>=-10&&position[0]<=-6&&position[2]>=-12&&position[2]<=-7&&Math.abs(position[1]-.92)<.6&&Math.hypot(position[0]-preservationPoint.position[0],position[2]-preservationPoint.position[2])<=preservationPoint.range;}
/** Authored epilogue provision, not a claim about the novel: a water-equipped rescue party
 * reaches the surviving repository after 540 compressed world seconds. No resource economy. */
export const recoveryProvision={arrivalTick:540*60,waterAvailable:true,assistanceAvailable:true};

export function validateLoopArchive(input:unknown):Archive {
 const archive=validateArchive(input),c=archive.checkpoint as LoopCheckpoint|null;
 if(!c){if(archive.civilization!==1||archive.history.length||archive.observations.length)throw Error('庭院档案缺少接续检查点，原档案保留。');return archive;}
 if(c.runtimeId!==LOOP_VERSION||c.scenarioId!==loopScenario.id||c.scenarioVersion!==loopScenario.version||c.integratorVersion!==loopScenario.integratorVersion)throw Error('庭院检查点版本不兼容；原档案保留，请先导出。');
 const expectedTime=c.tick*DT*loopScenario.timeScale;
 if(Math.abs(c.celestial.time+(c.celestialAccumulator??0)-expectedTime)>1e-6)throw Error('庭院时钟与轨道检查点不一致。');
 const m=c.courtyard;
 if(m?.quest!==undefined&&(!m.quest||typeof m.quest.accepted!=='boolean'||typeof m.quest.briefed!=='boolean'||m.quest.briefed&&!m.quest.accepted))throw Error('委托进度无效。');
 if(!m||m.version!==1||!['observing','aftermath','resolved'].includes(m.phase)||!Number.isInteger(m.observerId)||m.observerId<1||m.observerId>archive.civilization)throw Error('庭院接续状态无效。');
 if(c.ended!==(m.phase!=='observing')||(m.phase==='resolved')!==(m.recovery!==null&&m.recovery.observer!=='waiting'))throw Error('庭院结局阶段不一致。');
 if(m.phase==='observing'&&m.recovery!==null)throw Error('观测阶段不能含有复苏结果。');
 if(c.ended){const expected=outcome(c.preservation,true,archive.observations.filter(o=>o.civilization===archive.civilization).length);if(JSON.stringify(c.outcome)!==JSON.stringify(expected))throw Error('庭院结算与保存状态不一致。');}
 if(m.recovery){const r=m.recovery,conditions=r.conditions;
  if(!Number.isInteger(r.tick)||r.tick<c.tick||!['same','successor','waiting'].includes(r.observer)||!conditions||Object.keys(conditions).sort().join(',')!=='assistanceAvailable,bodyIntact,environmentSuitable,siteIntact,waterAvailable'||!Object.values(conditions).every(v=>typeof v==='boolean')||(r.observer==='same')!==canRevive(conditions)||(r.observer==='successor')!==(conditions.bodyIntact===false||conditions.siteIntact===false))throw Error('庭院复苏条件无效。');
 }
 return archive;
}

/** Fixed-step gameplay only. Browser visibility/occlusion and pointer lock stay in the runtime. */
export class CourtyardLoop {
 archive:Archive;
 environment:EnvironmentState;
 preservation:Preservation;
 tick:number;
 phase:LoopPhase;
 observerId:number;
 recovery:Recovery|null;
 quest:QuestProgress;
 private result:Outcome|null;
 constructor(input:Archive=emptyArchive()){
  this.archive=validateLoopArchive(input);const c=this.archive.checkpoint as LoopCheckpoint|null;
  this.environment=c?{celestial:structuredClone(c.celestial),celestialAccumulator:c.celestialAccumulator??0,temperature:c.temperature,heatLoad:c.heatLoad,dangerDuration:c.dangerDuration,warning:c.warning}:initialEnvironment(loopScenario);
  this.preservation=c?{...c.preservation}:freshPreservation();this.tick=c?.tick??0;this.phase=c?.courtyard.phase??'observing';this.observerId=c?.courtyard.observerId??1;this.recovery=c?.courtyard.recovery??null;this.result=c?.outcome??null;this.quest=c?.courtyard.quest?{...c.courtyard.quest}:{accepted:false,briefed:false};
 }
 get sky(){return environmentSky(this.environment.celestial,this.environment.celestialAccumulator,loopScenario);}
 get movementLocked(){return this.preservation.phase!=='idle'||this.phase!=='observing';}
 step(){
  if(this.phase!=='observing')return;
  this.tick++;this.environment=advanceEnvironment(this.environment,DT,loopScenario);
  this.preservation=stepPreservation(this.preservation,DT,this.environment.heatLoad,loopScenario.climate.facilityLimit);
  if(this.environment.dangerDuration>=loopScenario.climate.cityLimit){
   this.phase='aftermath';this.result=outcome(this.preservation,true,this.archive.observations.filter(o=>o.civilization===this.archive.civilization).length);
  }
 }
 beginPreservation(position:Vec3){
  if(this.phase!=='observing'||this.preservation.phase!=='idle'||!nearPreservationPoint(position))return false;
  this.preservation=beginPreservation(this.preservation);return true;
 }
 cancelPreservation(){const before=this.preservation;this.preservation=cancelPreservation(before);return before!==this.preservation;}
 /** The renderer supplies only IDs passing its real instrument line-of-sight test. */
 observation(visibleIds:readonly string[]):Observation {
  if(this.phase!=='observing'||this.preservation.phase!=='idle')throw Error('当前不能进行观测。');
  const sky=this.sky.filter(s=>s.direction[1]>.025&&visibleIds.includes(s.id));
  if(visibleIds.some(id=>!sky.some(s=>s.id===id)))throw Error('观测中包含不可见天体。');
  return sample(this.archive.civilization,this.tick,'pillar',sky,this.environment.temperature,{instrumentId:'courtyard-armillary',instrumentName:'观象仪',name:'观象庭院',position:[4,8.2,-6]});
 }
 record(observation:Observation){
  if(this.phase!=='observing'||observation.civilization!==this.archive.civilization||observation.tick!==this.tick)throw Error('观测时刻已变化，请重新读取仪器。');
  const expected=this.observation(observation.sunIds);
  if(JSON.stringify(expected)!==JSON.stringify(observation))throw Error('观测记录与当前读数不一致。');
  this.archive.observations=addObservation(this.archive.observations,observation);
 }
 /** Skip passive time after commitment, preserving the same fixed-step outcomes. */
 finishPreservation(){
  if(this.phase!=='observing'||!this.movementLocked)throw Error('尚未确认保存。');
  const limit=this.tick+60*900;
  while(this.phase==='observing'&&this.tick<limit)this.step();
  if(this.phase==='observing')throw Error('保存过场未能结束。');
 }
 /** Fast-forward is limited to the aftermath. It advances the same orbit/climate and
  * body integrity; it cannot rescue a living player who missed the preservation deadline. */
 resolveAftermath(provision=recoveryProvision):Recovery {
  if(this.recovery&&this.recovery.observer!=='waiting')return structuredClone(this.recovery);
  if(this.phase!=='aftermath')throw Error('灾变尚未结算。');
  let e=structuredClone(this.environment),p={...this.preservation},tick=this.tick;
  while(tick<this.tick+60*900){
   if(tick>=provision.arrivalTick&&e.temperature<loopScenario.climate.warning)break;
   e=advanceEnvironment(e,DT,loopScenario);p=stepPreservation(p,DT,e.heatLoad,loopScenario.climate.facilityLimit);tick++;
  }
  const conditions:RecoveryConditions={bodyIntact:this.result?.individual==='preserved'&&p.phase==='preserved'&&p.integrity>0,siteIntact:p.integrity>0,environmentSuitable:e.temperature<loopScenario.climate.warning,waterAvailable:provision.waterAvailable,assistanceAvailable:tick>=provision.arrivalTick&&provision.assistanceAvailable};
  this.recovery={tick,conditions,observer:canRevive(conditions)?'same':conditions.bodyIntact&&conditions.siteIntact?'waiting':'successor'};this.phase=this.recovery.observer==='waiting'?'aftermath':'resolved';return structuredClone(this.recovery);
 }
 checkpoint(pose:PlayerPose=initialPose):LoopCheckpoint {
  return {runtimeId:LOOP_VERSION,scenarioId:loopScenario.id,scenarioVersion:loopScenario.version,integratorVersion:loopScenario.integratorVersion,tick:this.tick,...structuredClone(this.environment),...structuredClone(pose),preservation:{...this.preservation},ended:this.phase!=='observing',outcome:this.result?{...this.result}:null,courtyard:{version:1,phase:this.phase,observerId:this.observerId,recovery:structuredClone(this.recovery),quest:{...this.quest}}};
 }
 snapshot(pose:PlayerPose=initialPose):Archive {return {...structuredClone(this.archive),checkpoint:this.checkpoint(pose)};}
 nextCivilization(){
  if(this.phase!=='resolved'||!this.recovery||!this.result)throw Error('请先查看灾变与接续结果。');
  const observerId=this.observerId+(this.recovery.observer==='same'?0:1);
  const archive:Archive={...structuredClone(this.archive),civilization:this.archive.civilization+1,checkpoint:null,history:[...this.archive.history,{civilization:this.archive.civilization,outcome:{...this.result}}]};
  const next=new CourtyardLoop();next.archive=archive;next.observerId=observerId;return next;
 }
}

/** Reuse archive transactions, backups and optimistic revision checks. A failed write
 * leaves the model intact; the UI must keep it paused and offer export/retry. */
export class CourtyardLoopStore {
 private readonly store:ArchiveStore;
 private writes:Promise<unknown>=Promise.resolve();
 constructor(databaseName=COURTYARD_LOOP_DB){this.store=new ArchiveStore(databaseName);}
 async open(){await this.store.open();const saved=await this.store.read();return new CourtyardLoop(saved??emptyArchive());}
 save(loop:CourtyardLoop,pose:PlayerPose=initialPose){
  const snapshot=loop.snapshot(pose);
  const run=this.writes.then(async()=>{snapshot.revision=loop.archive.revision;const saved=await this.store.save(validateLoopArchive(snapshot));loop.archive.revision=saved.revision;loop.archive.savedAt=saved.savedAt;return saved;});
  this.writes=run.catch(()=>{});return run;
 }
 readRaw(){return this.store.readRaw();}
 close(){this.store.close();}
}
