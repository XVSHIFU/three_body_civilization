import {test,expect,type Page} from '@playwright/test';
import {CourtyardLoop,COURTYARD_LOOP_DB} from '../../src/courtyard/loop';
import type {Archive} from '../../src/storage/archive';

// Synthetic isolated browser fixtures, generated from the real rules. They exercise UI
// refresh/failure boundaries only; they do not count as the two real-time walking routes.
async function seed(page:Page,archive:Archive){
 await page.goto('/courtyard.html?sample=1');await page.getByRole('button',{name:'进入庭院',exact:true}).waitFor();
 await page.evaluate(async({name,archive})=>{await new Promise<void>((resolve,reject)=>{const req=indexedDB.open(name,1);req.onupgradeneeded=()=>req.result.createObjectStore('archive');req.onsuccess=()=>{const db=req.result,tx=db.transaction('archive','readwrite');tx.objectStore('archive').put(archive,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};req.onerror=()=>reject(req.error);});},{name:COURTYARD_LOOP_DB,archive});
 await page.goto('/courtyard.html');await page.getByRole('button',{name:'进入庭院',exact:true}).waitFor();
}
async function read(page:Page){return page.evaluate(async(name)=>new Promise<any>((resolve,reject)=>{const req=indexedDB.open(name,1);req.onsuccess=()=>{const db=req.result,r=db.transaction('archive').objectStore('archive').get('current');r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);};req.onerror=()=>reject(req.error);}),COURTYARD_LOOP_DB);}
const enter=async(page:Page)=>{await page.getByRole('button',{name:'进入庭院',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);await expect(page.locator('#panel')).not.toBeVisible();};

 test('loop reading resumes once and refresh retains committed observations and paused progress',async({page})=>{
 const loop=new CourtyardLoop();for(let i=0;i<3600;i++)loop.step();loop.record(loop.observation(loop.sky.filter(s=>s.direction[1]>.025).map(s=>s.id)));
 await seed(page,loop.snapshot());await enter(page);await page.keyboard.press('j');await expect(page.getByRole('heading',{name:'观测日志',exact:true})).toBeVisible();await expect.poll(async()=>((await read(page))?.revision??0)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'返回场景',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
 await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'世界已暂停'})).toBeVisible();await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('界面字号').fill('1.5');await page.getByRole('button',{name:'返回',exact:true}).click();
 const saved=await read(page);await page.reload();await expect(page.getByRole('button',{name:'进入庭院',exact:true})).toBeVisible();await enter(page);await page.keyboard.press('j');await expect(page.locator('#panel-body')).toContainText('观测时刻 60秒');expect((await read(page)).observations).toEqual(saved.observations);
 });

 test('committing preservation skips waiting, retains outcomes and survives refresh',async({page})=>{
 for(const seconds of [100,175]){
 const loop=new CourtyardLoop();for(let i=0;i<seconds*60;i++)loop.step();await seed(page,loop.snapshot({position:[-8,.92,-9.4],yaw:Math.atan2(1,1.1),pitch:Math.atan2(-.535,Math.hypot(1,1.1))}));await enter(page);await expect(page.locator('#target')).toBeVisible();await page.keyboard.press('e');
 await expect(page.locator('#panel-body')).toContainText('太晚开始可能无法完成');
 await page.getByRole('button',{name:'开始脱水保存'}).click();await expect(page.getByRole('heading',{name:'灾变之后',exact:true})).toBeVisible({timeout:4000});
 await expect(page.locator('#panel-body')).toContainText('这次选择留下了什么');if(seconds===175)await expect(page.locator('#panel-body')).toContainText('尚未完成');
 const saved=await read(page);expect(saved.checkpoint.tick).toBe(10842);expect(saved.checkpoint.outcome.individual).toBe(seconds===100?'preserved':'lost');
 await page.reload();await expect(page.getByRole('heading',{name:'灾变之后',exact:true})).toBeVisible();await page.getByRole('button',{name:'经过灾变，查看接续'}).click();await expect(page.getByRole('heading',{name:seconds===100?'同一观察者复苏':'后来者接续档案',exact:true})).toBeVisible();
 }
 });

 test('storage failure pauses with export and retry, without replacing the last committed archive',async({page})=>{
 await page.goto('/courtyard.html');await enter(page);await page.keyboard.press('j');await expect.poll(async()=>((await read(page))?.revision??0)).toBeGreaterThan(0);const saved=await read(page);await page.getByRole('button',{name:'返回场景',exact:true}).click();
 await page.evaluate(()=>{const original=IDBDatabase.prototype.transaction;(window as any).__restoreStorage=()=>{IDBDatabase.prototype.transaction=original;};IDBDatabase.prototype.transaction=function(...args:any[]){if(args[1]==='readwrite')throw new DOMException('Synthetic quota failure','QuotaExceededError');return original.apply(this,args as any);};});
 await page.keyboard.press('j');await expect(page.getByRole('heading',{name:'档案尚未写入'})).toBeVisible();await expect(page.getByRole('button',{name:'导出当前进度'})).toBeVisible();expect((await read(page)).revision).toBe(saved.revision);
 await page.evaluate(()=>(window as any).__restoreStorage());await page.getByRole('button',{name:'重试写入'}).click();await expect(page.getByRole('heading',{name:'世界已暂停'})).toBeVisible();expect((await read(page)).revision).toBeGreaterThan(saved.revision);
 });

 test('another tab revision is never overwritten by stale courtyard state',async({page,context})=>{
 await page.goto('/courtyard.html');await enter(page);await page.keyboard.press('j');await expect.poll(async()=>((await read(page))?.revision??0)).toBeGreaterThan(0);
 const writer=await context.newPage();await writer.goto('/courtyard.html?sample=1');await writer.getByRole('button',{name:'进入庭院',exact:true}).waitFor();
 const written=await writer.evaluate(async name=>new Promise<number>((resolve,reject)=>{const r=indexedDB.open(name,1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('archive','readwrite'),store=tx.objectStore('archive'),get=store.get('current');let revision=0;get.onsuccess=()=>{const a=get.result;revision=++a.revision;store.put(a,'current');};tx.oncomplete=()=>{db.close();resolve(revision);};tx.onabort=()=>reject(tx.error);};}),COURTYARD_LOOP_DB);
 await page.bringToFront();await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'档案尚未写入'})).toBeVisible();await expect(page.locator('#storage-failure')).toContainText('另一个标签页');expect((await read(page)).revision).toBe(written);await writer.close();
 });

 test('instrument compares current sky to the last committed observation',async({page})=>{
 const loop=new CourtyardLoop();while(loop.tick<45*60)loop.step();loop.record(loop.observation(['s1']));while(loop.tick<140*60)loop.step();
 await seed(page,loop.snapshot({position:[4,2.4,-2.8],yaw:0,pitch:Math.atan2(-.495,.85)}));await enter(page);await expect(page.locator('#target')).toBeVisible();await page.keyboard.press('e');
 await expect(page.locator('#panel-body')).toContainText('新出现 2 个');await expect(page.locator('#panel-body')).toContainText('高度变化');
 await page.screenshot({path:'.handoff-local/observation-comparison.png'});
 });

 test('inherited observations guide the next attempt without inventing unseen sky',async({page})=>{
 const loop=new CourtyardLoop();while(loop.tick<45*60)loop.step();loop.record(loop.observation(['s1']));while(loop.tick<100*60)loop.step();loop.beginPreservation([-8,.92,-10]);loop.finishPreservation();loop.resolveAftermath();
 const next=loop.nextCivilization();await seed(page,next.snapshot());
 await expect(page.locator('#panel-body')).toContainText('45秒：1个光源');await expect(page.locator('#panel-body')).not.toContainText('3个光源');
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('界面字号').fill('1.5');await page.getByRole('button',{name:'返回',exact:true}).click();
 await page.setViewportSize({width:1024,height:640});await expect(page.getByRole('button',{name:'进入庭院',exact:true})).toBeInViewport();await page.screenshot({path:'.handoff-local/inherited-welcome.png'});await enter(page);await page.keyboard.press('j');await expect(page.locator('#panel-body')).toContainText('前人留下的天象');
 });
