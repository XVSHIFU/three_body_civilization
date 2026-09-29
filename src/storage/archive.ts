import {BUILD_ID} from '../build-info';
import {observationId,type Observation,type Hypothesis} from '../gameplay/evidence';
import type {CelestialState,Vec3} from '../simulation/core';
import type {Preservation,Outcome} from '../gameplay/preservation';
export interface Settings {theme:'a'|'b'|'c';fontScale:number;quality:'low'|'standard'|'high';fov:number;sensitivity:number;volume:number;bassVolume:number;reducedMotion:boolean;captions:boolean;keys:{forward:string;back:string;left:string;right:string;interact:string;journal:string}}
export const defaultSettings:Settings={theme:'b',fontScale:1,quality:'standard',fov:65,sensitivity:1,volume:0.35,bassVolume:.5,reducedMotion:true,captions:true,keys:{forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',interact:'KeyE',journal:'KeyJ'}};
export interface Checkpoint {anomalyTick?:number|null;runtimeId?:string;scenarioId:string;scenarioVersion:number;integratorVersion:string;tick:number;celestial:CelestialState;celestialAccumulator?:number;motion?:{verticalSpeed:number;grounded:boolean;safePosition:Vec3};npcs?:{position:Vec3;yaw:number;state:'idle'|'observe'|'shelter'|'preserved';waypoint:number;preserveElapsed?:number}[];temperature:number;heatLoad:number;dangerDuration:number;warning:boolean;position:Vec3;yaw:number;pitch:number;preservation:Preservation;ended:boolean;outcome:Outcome|null}
export interface Archive {schemaVersion:1;buildId:string;revision:number;civilization:number;observations:Observation[];hypothesis:Hypothesis;settings:Settings;checkpoint:Checkpoint|null;history:{civilization:number;outcome:Outcome}[];savedAt:string|null}
export const emptyArchive=():Archive=>({schemaVersion:1,buildId:BUILD_ID,revision:0,civilization:1,observations:[],hypothesis:{proposed:false,evidenceIds:[],status:'tentative'},settings:structuredClone(defaultSettings),checkpoint:null,history:[],savedAt:null});
export const DB_NAME='three-body-civilization:archive:v1';
export interface BackupSummary {key:string;kind:'last-good'|'retired-checkpoint'|'quarantine'|'conflict-copy';civilization:number|null;savedAt:string|null;readable:boolean}
const isBackupKey=(key:string)=>key==='last-good'||/^(retired-checkpoint|quarantine|conflict-copy):[a-f0-9-]{36}$/.test(key);
export class ConflictError extends Error {constructor(){super('另一个标签页已更新档案，请重新读取后继续。');}}
function finiteDeep(v:unknown,depth=0):boolean {if(depth>30)return false;if(typeof v==='number')return Number.isFinite(v);if(Array.isArray(v))return v.length<100000&&v.every(x=>finiteDeep(x,depth+1));if(v&&typeof v==='object')return Object.entries(v).every(([k,x])=>!['__proto__','constructor','prototype'].includes(k)&&finiteDeep(x,depth+1));return ['string','boolean','undefined'].includes(typeof v)||v===null;}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const vector=(v:unknown):v is Vec3=>Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='number'&&Number.isFinite(x));
const validOutcome=(v:unknown):v is Outcome=>record(v)&&['destroyed','standing'].includes(v.city as string)&&['preserved','lost'].includes(v.individual as string)&&typeof v.reason==='string'&&v.reason.length<=2000&&Number.isInteger(v.evidenceCount)&&(v.evidenceCount as number)>=0;
export function validateArchive(value:unknown):Archive {
  if(!record(value)||!finiteDeep(value)||value.schemaVersion!==1)throw Error('存档版本不支持或数值无效；原文件未被修改。');
  const a=value as unknown as Archive;
  if(!Number.isInteger(a.revision)||a.revision<0||!Number.isInteger(a.civilization)||a.civilization<1||a.civilization>100000)throw Error('文明编号或存档修订无效。');
  if(!Array.isArray(a.observations)||a.observations.length>20000||!Array.isArray(a.history)||a.history.length>10000)throw Error('档案条目无效。');
  const ids=new Set<string>();
  for(const o of a.observations){if(!record(o)||typeof o.id!=='string'||!/^c\d+-(pillar|thermometer)-\d+(?:-[a-z][a-z0-9-]{0,63})?$/.test(o.id)||ids.has(o.id)||!Number.isInteger(o.civilization)||!Number.isInteger(o.tick)||o.tick<0||!['pillar','thermometer'].includes(o.source)||!Array.isArray(o.sunIds)||!o.sunIds.every(s=>['s1','s2','s3'].includes(s))||!record(o.directions)||!Object.entries(o.directions).every(([id,d])=>['s1','s2','s3'].includes(id)&&vector(d))||!(o.temperature===null||typeof o.temperature==='number'))throw Error('观测记录校验失败。');ids.add(o.id);}
  const s=a.settings;
  for(const o of a.observations){
    if(o.location!==undefined&&(!record(o.location)||typeof o.location.instrumentId!=='string'||! /^[a-z][a-z0-9-]{0,63}$/.test(o.location.instrumentId)||typeof o.location.instrumentName!=='string'||!o.location.instrumentName.trim()||o.location.instrumentName.length>100||typeof o.location.name!=='string'||!o.location.name.trim()||o.location.name.length>100||!vector(o.location.position)||o.location.position.some(n=>Math.abs(n)>500)))throw Error('观测地点无效。');
    if(o.civilization<1||o.civilization>a.civilization||o.id!==observationId(o.civilization,o.tick,o.source,o.location)||new Set(o.sunIds).size!==o.sunIds.length)throw Error('样本身份或时间窗不一致。');
    const directions=Object.keys(o.directions);
    if(o.source==='pillar'){
      if(o.temperature!==null||directions.length!==o.sunIds.length||!o.sunIds.every(id=>directions.includes(id))||Object.values(o.directions).some(d=>Math.abs(Math.hypot(...d)-1)>1e-5||d[1]<=.025))throw Error('观象样本方向与可见天体不一致。');
    }else if(o.sunIds.length||directions.length||typeof o.temperature!=='number')throw Error('温度样本包含无效观测字段。');
  }
  if(!record(s)||!['a','b','c'].includes(s.theme)||!['low','standard','high'].includes(s.quality)||!(s.fontScale>=1&&s.fontScale<=1.5)||!(s.fov>=55&&s.fov<=85)||!(s.sensitivity>=0.2&&s.sensitivity<=3)||!(s.volume>=0&&s.volume<=1)||typeof s.captions!=='boolean'||typeof s.reducedMotion!=='boolean'||!record(s.keys)||!Object.values(s.keys).every(k=>typeof k==='string'&&/^(Key[A-Z]|Arrow(Up|Down|Left|Right))$/.test(k))||new Set(Object.values(s.keys)).size!==6)throw Error('设置字段校验失败。');
  if(!record(a.hypothesis)||typeof a.hypothesis.proposed!=='boolean'||!['tentative','refuted'].includes(a.hypothesis.status)||!Array.isArray(a.hypothesis.evidenceIds)||!a.hypothesis.evidenceIds.every(id=>ids.has(id)))throw Error('假设证据引用无效。');
  const hypothesisHistory=a.hypothesis.history;
  if(hypothesisHistory!==undefined){
    if(!Array.isArray(hypothesisHistory)||hypothesisHistory.length>1000||hypothesisHistory.some((entry,index)=>!record(entry)||entry.revision!==index+1||!['proposed','used','refuted','revised','withdrawn'].includes(entry.action)||!Number.isInteger(entry.civilization)||entry.civilization<1||entry.civilization>a.civilization||!Array.isArray(entry.evidenceIds)||!entry.evidenceIds.length||new Set(entry.evidenceIds).size!==entry.evidenceIds.length||!entry.evidenceIds.every(id=>ids.has(id))||typeof entry.note!=='string'||entry.note.length>500||(['used','refuted','revised'].includes(entry.action)&&!entry.note.trim())))throw Error('假设修订历史无效。');
    const latest=hypothesisHistory.at(-1);
    if(latest&&(a.hypothesis.proposed!==(latest.action!=='withdrawn')||latest.action==='refuted'&&a.hypothesis.status!=='refuted'||['proposed','used','revised'].includes(latest.action)&&a.hypothesis.status!=='tentative'||JSON.stringify(a.hypothesis.evidenceIds)!==JSON.stringify(latest.evidenceIds)))throw Error('假设当前状态与历史不一致。');
  }
  if(a.checkpoint!==null){const c=a.checkpoint;if(!record(c)||typeof c.scenarioId!=='string'||! /^[a-z][a-z0-9_-]{0,63}$/.test(c.scenarioId)||!Number.isInteger(c.scenarioVersion)||c.scenarioVersion<1||typeof c.integratorVersion!=='string'||c.integratorVersion.length>64||!Number.isInteger(c.tick)||c.tick<0||!vector(c.position)||c.position.some(n=>Math.abs(n)>500)||typeof c.yaw!=='number'||typeof c.pitch!=='number'||!record(c.celestial)||!Array.isArray(c.celestial.stars)||c.celestial.stars.length!==3||![...c.celestial.stars,c.celestial.planet].every(b=>record(b)&&vector(b.position)&&vector(b.velocity)&&typeof b.mass==='number'&&typeof b.luminosity==='number')||!record(c.preservation)||!['idle','preparing','entering','sealing','dehydrating','preserved','failed'].includes(c.preservation.phase)||typeof c.ended!=='boolean'||typeof c.temperature!=='number'||typeof c.heatLoad!=='number'||typeof c.dangerDuration!=='number'||typeof c.warning!=='boolean')throw Error('检查点校验失败。');}
  if(typeof a.buildId!=='string'||!(a.savedAt===null||typeof a.savedAt==='string'))throw Error('档案元数据无效。');
  if(a.history.some(h=>!record(h)||!Number.isInteger(h.civilization)||h.civilization<1||h.civilization>=a.civilization||!validOutcome(h.outcome))||new Set(a.history.map(h=>h.civilization)).size!==a.history.length)throw Error('文明历史校验失败。');
  const requiredKeys=['forward','back','left','right','interact','journal'];
  if(![s.fontScale,s.fov,s.sensitivity,s.volume].every(v=>typeof v==='number'))throw Error('设置数值类型无效。');
  if(Object.keys(s.keys).length!==6||!requiredKeys.every(k=>k in s.keys))throw Error('设置动作键缺失。');
  if(a.checkpoint){const c=a.checkpoint;
    if(c.anomalyTick!==undefined&&c.anomalyTick!==null&&(!Number.isInteger(c.anomalyTick)||c.anomalyTick<0||c.anomalyTick>c.tick))throw Error('异常提示时间无效。');
    if(c.runtimeId!==undefined&&(typeof c.runtimeId!=='string'||c.runtimeId.length>128))throw Error('检查点构建标识无效。');
    if(typeof c.celestial.time!=='number'||c.celestial.time<0||c.celestial.stars.map(b=>b.id).join(',')!=='s1,s2,s3'||c.celestial.stars.some(b=>b.mass<=0||b.luminosity<0)||c.celestial.planet.mass!==0||c.dangerDuration<0||c.heatLoad<0||Math.abs(c.pitch)>85*Math.PI/180||typeof c.preservation.elapsed!=='number'||c.preservation.elapsed<0||typeof c.preservation.integrity!=='number'||c.preservation.integrity<0||c.preservation.integrity>1||(c.ended?!validOutcome(c.outcome):c.outcome!==null))throw Error('检查点状态校验失败。');
    if(c.celestialAccumulator!==undefined&&(typeof c.celestialAccumulator!=='number'||c.celestialAccumulator<0||c.celestialAccumulator>=(['validation-001','compressed-001'].includes(c.scenarioId)&&c.scenarioVersion===1&&c.integratorVersion==='verlet-1'?.002:1)))throw Error('检查点积分余量无效。');
    if(c.motion!==undefined&&(!record(c.motion)||typeof c.motion.verticalSpeed!=='number'||Math.abs(c.motion.verticalSpeed)>30||typeof c.motion.grounded!=='boolean'||!vector(c.motion.safePosition)||c.motion.safePosition.some(n=>Math.abs(n)>500)))throw Error('检查点移动状态无效。');
    if(c.npcs!==undefined&&(!Array.isArray(c.npcs)||c.npcs.length!==6||c.npcs.some(n=>!record(n)||!vector(n.position)||n.position.some(v=>Math.abs(v)>500)||typeof n.yaw!=='number'||!['idle','observe','shelter','preserved'].includes(n.state)||!Number.isInteger(n.waypoint)||n.waypoint<0||n.waypoint>3||(n.preserveElapsed!==undefined&&(typeof n.preserveElapsed!=='number'||n.preserveElapsed<0||n.preserveElapsed>3)))))throw Error('检查点人物状态无效。');
  }
  if(s.bassVolume!==undefined&&(typeof s.bassVolume!=='number'||s.bassVolume<0||s.bassVolume>1))throw Error('低频音量设置无效。');
  return {...structuredClone(a),settings:{...structuredClone(s),bassVolume:s.bassVolume??.5}};
}
export function parseImport(text:string):Archive {if(new TextEncoder().encode(text).length>4*1024*1024)throw Error('导入文件超过 4 MB。');return validateArchive(JSON.parse(text));}
const request=<T>(req:IDBRequest<T>):Promise<T>=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
export class ArchiveStore {
  constructor(private databaseName=DB_NAME){}
  private db:IDBDatabase|null=null;private queue:Promise<unknown>=Promise.resolve();
  async open(onBlocked:()=>void=()=>{}){const r=indexedDB.open(this.databaseName,1);r.onupgradeneeded=()=>r.result.createObjectStore('archive');r.onblocked=onBlocked;this.db=await request(r);this.db.onversionchange=()=>{this.close();onBlocked();};}
  async read(key='current'):Promise<Archive|null>{if(!this.db)throw Error('本地档案不可用');const value=await request(this.db.transaction('archive').objectStore('archive').get(key));return value?validateArchive(value):null;}
  async readRaw():Promise<unknown>{if(!this.db)throw Error('本地档案不可用');return request(this.db.transaction('archive').objectStore('archive').get('current'));}
  async readBackupRaw(key:string):Promise<unknown>{
    if(!isBackupKey(key))throw Error('备份标识无效。');
    if(!this.db)throw Error('本地档案不可用');
    const value=await request(this.db.transaction('archive').objectStore('archive').get(key));
    if(value===undefined)throw Error('此备份已不存在，请刷新列表。');
    return value;
  }
  async listBackups():Promise<BackupSummary[]>{
    if(!this.db)throw Error('本地档案不可用');
    return new Promise((resolve,reject)=>{
      const transaction=this.db!.transaction('archive'),cursor=transaction.objectStore('archive').openCursor(),items:BackupSummary[]=[];
      cursor.onsuccess=()=>{
        const entry=cursor.result;if(!entry)return;
        const key=String(entry.key),value=entry.value;
        if(isBackupKey(key)){
          let readable=false;try{validateArchive(value);readable=true;}catch{/* Damaged originals remain exportable. */}
          items.push({key,kind:key==='last-good'?'last-good':key.startsWith('quarantine:')?'quarantine':key.startsWith('conflict-copy:')?'conflict-copy':'retired-checkpoint',
            civilization:record(value)&&Number.isInteger(value.civilization)&&Number(value.civilization)>0?Number(value.civilization):null,
            savedAt:record(value)&&typeof value.savedAt==='string'&&Number.isFinite(Date.parse(value.savedAt))?value.savedAt:null,readable});
        }
        entry.continue();
      };
      transaction.oncomplete=()=>resolve(items.sort((a,b)=>(b.savedAt?Date.parse(b.savedAt):0)-(a.savedAt?Date.parse(a.savedAt):0)));
      transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error??Error('备份读取被中断。'));
    });
  }
  readLatestPreserving(local:Archive):Promise<Archive>{
    const snapshot=structuredClone(validateArchive(local));
    const run=this.queue.then(()=>new Promise<Archive>((resolve,reject)=>{
      if(!this.db){reject(Error('本地档案不可用'));return;}
      const tx=this.db.transaction('archive','readwrite'),store=tx.objectStore('archive');let latest:Archive,problem:unknown;
      const request=store.get('current');request.onsuccess=()=>{
        try{latest=validateArchive(request.result);store.put(snapshot,`conflict-copy:${crypto.randomUUID()}`);}
        catch(error){problem=error;tx.abort();}
      };
      tx.oncomplete=()=>resolve(latest!);
      tx.onabort=()=>reject(problem??tx.error??Error('读取事务中断，当前页面进度仍保留。'));tx.onerror=()=>{};
    }));this.queue=run.catch(()=>{});return run;
  }
  recoverLastGood():Promise<Archive>{
    const run=this.queue.then(()=>new Promise<Archive>((resolve,reject)=>{
      if(!this.db){reject(Error('本地档案不可用'));return;}
      const tx=this.db.transaction('archive','readwrite'),store=tx.objectStore('archive');
      let restored:Archive,problem:unknown;
      const current=store.get('current');current.onsuccess=()=>{
        try{validateArchive(current.result);problem=Error('当前档案已有效，请重新读取，避免覆盖其他标签页的更新。');tx.abort();return;}catch(e){if(problem)return;}
        const backup=store.get('last-good');backup.onsuccess=()=>{
          try{
            const valid=validateArchive(backup.result);
            const oldRevision=record(current.result)&&Number.isSafeInteger(current.result.revision)?current.result.revision as number:0;
            restored={...valid,revision:Math.max(valid.revision,oldRevision)+1,savedAt:new Date().toISOString()};
            if(current.result!==undefined)store.put(current.result,`quarantine:${crypto.randomUUID()}`);
            store.put(restored,'current');
          }catch(e){problem=e;tx.abort();}
        };
      };
      tx.oncomplete=()=>resolve(restored!);
      tx.onabort=()=>reject(problem??tx.error??Error('恢复事务失败，原档案未改变。'));
      tx.onerror=()=>{};
    }));this.queue=run.catch(()=>{});return run;
  }
  save(archive:Archive,options:{preservePrevious?:boolean}={}):Promise<Archive>{const run=this.queue.then(()=>this.commit(archive,options.preservePrevious));this.queue=run.catch(()=>{});return run;}
  private commit(input:Archive,preservePrevious=false):Promise<Archive>{
    const checked=validateArchive(input);if(!this.db)return Promise.reject(Error('本地档案不可用'));
    return new Promise((resolve,reject)=>{const tx=this.db!.transaction('archive','readwrite'),store=tx.objectStore('archive');let next:Archive;let conflict=false;
      const read=store.get('current');read.onsuccess=()=>{const previous=read.result as Archive|undefined;if(previous){try{validateArchive(previous);}catch{tx.abort();return;}}if(previous&&previous.revision!==checked.revision){conflict=true;tx.abort();return;}next={...checked,revision:checked.revision+1,savedAt:new Date().toISOString()};if(previous){store.put(previous,'last-good');if(preservePrevious)store.put(previous,`retired-checkpoint:${crypto.randomUUID()}`);}store.put(next,'current');};
      tx.oncomplete=()=>resolve(next!);tx.onabort=()=>reject(conflict?new ConflictError():tx.error??Error('存档事务中断；上一份档案仍保留。'));tx.onerror=()=>{};
    });
  }
  close(){this.db?.close();this.db=null;}
}



