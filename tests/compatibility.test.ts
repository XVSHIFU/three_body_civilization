import 'fake-indexeddb/auto';
import {it,expect} from 'vitest';
import {BUILD_ID,RUNTIME_ID} from '../src/build-info';
import {ArchiveStore,DB_NAME,emptyArchive,parseImport,type Checkpoint} from '../src/storage/archive';
import {checkpointIssues,inheritArchive} from '../src/storage/compatibility';
import {initialEnvironment} from '../src/simulation/environment';
import {scenario} from '../src/simulation/scenario';
import {freshPreservation} from '../src/gameplay/preservation';
import {sample} from '../src/gameplay/evidence';

function fixture(){
 const archive=emptyArchive();
 archive.observations=[sample(1,0,'thermometer',[],28)];
 archive.checkpoint={...initialEnvironment(scenario),runtimeId:RUNTIME_ID,scenarioId:scenario.id,scenarioVersion:scenario.version,integratorVersion:scenario.integratorVersion,tick:0,position:[0,.9,64],yaw:0,pitch:0,preservation:freshPreservation(),ended:false,outcome:null,motion:{verticalSpeed:0,grounded:false,safePosition:[0,.9,64]},npcs:Array.from({length:6},()=>({position:[0,0,0],yaw:0,state:'idle',waypoint:0}))} as Checkpoint;
 return archive;
}

it('preserves the anomaly event marker and rejects future or invalid event times',()=>{
 const archive=fixture();archive.checkpoint!.anomalyTick=0;
 expect(parseImport(JSON.stringify(archive)).checkpoint!.anomalyTick).toBe(0);
 for(const tick of [-1,.5,1]){archive.checkpoint!.anomalyTick=tick;expect(()=>parseImport(JSON.stringify(archive))).toThrow('异常提示时间');}
 archive.checkpoint!.anomalyTick=null;expect(parseImport(JSON.stringify(archive)).checkpoint!.anomalyTick).toBeNull();
});

it('distinguishes safe UI-only builds from incompatible rules and legacy incomplete checkpoints',()=>{
 const archive=fixture();archive.buildId='different-ui-build';expect(checkpointIssues(archive)).toEqual([]);
 archive.checkpoint!.runtimeId='old-runtime';expect(checkpointIssues(archive)).toHaveLength(1);
 delete archive.checkpoint!.motion;expect(checkpointIssues(archive)).toHaveLength(2);
 archive.checkpoint=null;expect(checkpointIssues(archive)).toEqual([]);
});

it('keeps a structurally valid unknown scenario exportable and inherits only recorded state',()=>{
 const archive=fixture();archive.checkpoint!.scenarioId='future-scenario';archive.checkpoint!.scenarioVersion=2;archive.checkpoint!.integratorVersion='future-integrator';
 const parsed=parseImport(JSON.stringify(archive));expect(checkpointIssues(parsed).length).toBeGreaterThan(0);
 const next=inheritArchive(parsed);expect(next.civilization).toBe(2);expect(next.checkpoint).toBeNull();expect(next.buildId).toBe(BUILD_ID);
 expect(next.observations).toEqual(archive.observations);expect(next.hypothesis).toEqual(archive.hypothesis);expect(next.history).toEqual([]);
 expect(archive.checkpoint).not.toBeNull();expect(archive.civilization).toBe(1);
});

it('archives the original checkpoint in the same transaction and leaves it intact on a stale write',async()=>{
 const store=new ArchiveStore();await store.open();const original=await store.save(fixture());
 const candidate=inheritArchive(original);const saved=await store.save(candidate,{preservePrevious:true});
 expect(saved.civilization).toBe(2);expect((await store.read('last-good'))?.checkpoint).toEqual(original.checkpoint);
 const retired=await new Promise<unknown[]>((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('archive'),bucket=transaction.objectStore('archive'),keys=bucket.getAllKeys();keys.onsuccess=()=>{const retiredKeys=keys.result.filter(key=>String(key).startsWith('retired-checkpoint:'));Promise.all(retiredKeys.map(key=>new Promise(resolve=>{const read=bucket.get(key);read.onsuccess=()=>resolve(read.result);}))).then(resolve);};transaction.oncomplete=()=>db.close();};request.onerror=()=>reject(request.error);
 });
 expect(retired).toHaveLength(1);expect(retired[0]).toEqual(original);
 const backups=await store.listBackups(),retiredSummary=backups.find(item=>item.kind==='retired-checkpoint')!;
 expect(retiredSummary.readable).toBe(true);expect(retiredSummary.civilization).toBe(1);
 expect(await store.readBackupRaw(retiredSummary.key)).toEqual(original);
 await expect(store.readBackupRaw('current')).rejects.toThrow('标识');
 expect(await store.read()).toEqual(saved);
 await expect(store.save(candidate,{preservePrevious:true})).rejects.toThrow('另一个标签页');
 expect(await store.read()).toEqual(saved);store.close();
});
