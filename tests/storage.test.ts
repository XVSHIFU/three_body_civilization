import 'fake-indexeddb/auto';
import {it,expect,beforeEach} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
beforeEach(()=>{globalThis.indexedDB=new IDBFactory();});
import {ArchiveStore,emptyArchive,parseImport} from '../src/storage/archive';
import {DB_NAME} from '../src/storage/archive';
import {sample} from '../src/gameplay/evidence';
it('rejects inconsistent sample IDs and unsupported knowledge evidence',()=>{
 const archive=emptyArchive();archive.observations=[sample(1,610,'pillar',[{id:'s1',direction:[0,1,0],aboveHorizon:true,irradiance:1}],28)];
 expect(parseImport(JSON.stringify(archive)).observations).toHaveLength(1);
 const wrongId=structuredClone(archive);wrongId.observations[0].tick=0;expect(()=>parseImport(JSON.stringify(wrongId))).toThrow('身份');
 const absentDirection=structuredClone(archive);absentDirection.observations[0].sunIds.push('s2');expect(()=>parseImport(JSON.stringify(absentDirection))).toThrow('方向');
 const hidden=structuredClone(archive);hidden.observations[0].directions.s1=[0,-1,0];expect(()=>parseImport(JSON.stringify(hidden))).toThrow('方向');
 const precise=structuredClone(archive);precise.observations[0].temperature=28;expect(()=>parseImport(JSON.stringify(precise))).toThrow('方向');
});
async function overwriteCurrent(value:unknown,key='current'){
  await new Promise<void>((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('archive','readwrite');tx.objectStore('archive').put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};};request.onerror=()=>reject(request.error);});
}
it('retains unsaved page state while atomically reading another writer without overwriting it',async()=>{
 const page=new ArchiveStore(),writer=new ArchiveStore();await page.open();await writer.open();
 const base=await page.read()??emptyArchive(),local=structuredClone(base);
 local.observations=[sample(local.civilization,36000,'thermometer',[],42)];local.hypothesis={proposed:false,evidenceIds:[],status:'tentative'};
 const latest=await writer.save({...base,settings:{...base.settings,theme:'c'}});
 const reread=await page.readLatestPreserving(local);
 expect(reread).toEqual(latest);expect(await writer.read()).toEqual(latest);
 const copies=(await page.listBackups()).filter(item=>item.kind==='conflict-copy');
 expect(copies.length).toBeGreaterThan(0);
 const preserved=await Promise.all(copies.map(item=>page.readBackupRaw(item.key)));
 expect(preserved).toContainEqual(local);
 const before=(await page.listBackups()).length;
 await overwriteCurrent({schemaVersion:99});
 await expect(page.readLatestPreserving(local)).rejects.toThrow('版本');
 expect((await page.listBackups()).length).toBe(before);
 await overwriteCurrent(latest);page.close();writer.close();
});
it('commits whole checkpoints, retains last-good and rejects stale writers',async()=>{const a=new ArchiveStore(),b=new ArchiveStore();await a.open();await b.open();const old=emptyArchive();const saved=await a.save(old);expect(saved.revision).toBe(1);await expect(b.save(old)).rejects.toThrow('另一个标签页');const next=await a.save({...saved,civilization:2});expect(next.revision).toBe(2);expect((await a.read('last-good'))?.civilization).toBe(1);expect((await b.read())?.civilization).toBe(2);a.close();b.close();});
it('rejects invalid imports without touching the database',()=>{expect(()=>parseImport('{"schemaVersion":99}')).toThrow();const a=emptyArchive();a.settings.volume=9;expect(()=>parseImport(JSON.stringify(a))).toThrow('设置');expect(()=>parseImport('x'.repeat(4*1024*1024+1))).toThrow('4 MB');});
it('migrates missing bass volume without mutating the imported data and rejects invalid levels',()=>{
 const legacy=JSON.parse(JSON.stringify(emptyArchive()));delete legacy.settings.bassVolume;
 expect(parseImport(JSON.stringify(legacy)).settings.bassVolume).toBe(.5);
 expect(legacy.settings.bassVolume).toBeUndefined();
 legacy.settings.bassVolume=-1;expect(()=>parseImport(JSON.stringify(legacy))).toThrow('低频');
 legacy.settings.bassVolume=0;expect(parseImport(JSON.stringify(legacy)).settings.bassVolume).toBe(0);
});
it('quarantines corruption and restores last-good atomically without overwriting a valid current archive',async()=>{
  const store=new ArchiveStore();await store.open();
  const before={...emptyArchive(),revision:8};
  const good={...emptyArchive(),revision:9};
  await overwriteCurrent(before,'last-good');
  const broken={...good,settings:{...good.settings,volume:99}};
  await overwriteCurrent(broken);
  await expect(store.save(good)).rejects.toThrow();
  expect(await store.readRaw()).toEqual(broken);
  const recovered=await store.recoverLastGood();
  expect(recovered.revision).toBe(10);
  expect(recovered.civilization).toBe(before.civilization);
  expect(await store.read()).toEqual(recovered);
  const quarantine=(await store.listBackups()).find(item=>item.kind==='quarantine')!;
  expect(quarantine.readable).toBe(false);
  expect(await store.readBackupRaw(quarantine.key)).toEqual(broken);
  await expect(store.recoverLastGood()).rejects.toThrow('当前档案已有效');
  expect(await store.read()).toEqual(recovered);
  store.close();
});

