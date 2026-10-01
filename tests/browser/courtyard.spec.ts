import {test,expect} from '@playwright/test';

test('courtyard reading returns on the same click; Esc and settings retain pause',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/courtyard.html?sample=1');
 await page.getByRole('button',{name:'进入庭院',exact:true}).click();
 const locked=()=>page.evaluate(()=>document.pointerLockElement instanceof HTMLCanvasElement);
 await expect.poll(locked).toBe(true);
 await expect(page.getByRole('dialog')).not.toBeVisible();
 for(let i=0;i<3;i++){
  await page.keyboard.press('j');await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(locked).toBe(false);
  await page.getByRole('button',{name:i%2?'关闭面板':'返回场景',exact:true}).click();
  await expect.poll(locked).toBe(true);await expect(page.getByRole('dialog')).not.toBeVisible();
 }
 await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'世界已暂停'})).toBeVisible();
 await page.getByRole('button',{name:'观测日志',exact:true}).click();
 await page.getByRole('button',{name:'返回暂停',exact:true}).click();await expect.poll(locked).toBe(false);
 await page.getByRole('button',{name:'设置',exact:true}).click();
 await page.getByLabel('检查光照').selectOption('disaster');
 await page.getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.getByRole('heading',{name:'世界已暂停'})).toBeVisible();await expect.poll(locked).toBe(false);
 await page.getByRole('button',{name:'继续探索',exact:true}).click();await expect.poll(locked).toBe(true);
 expect(errors).toEqual([]);
});

test('a missing courtyard model stays in a recoverable error screen after Esc',async({page})=>{
 await page.route('**/assets/courtyard/observer.glb',route=>route.fulfill({status:503,body:'synthetic model fault'}));
 await page.goto('/courtyard.html?sample=1');await expect(page.getByRole('heading',{name:'庭院暂时无法继续'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'庭院暂时无法继续'})).toBeVisible();
 await expect(page.getByRole('button',{name:'重新加载'})).toBeVisible();
});

// Synthetic browser failures verify recovery boundaries, not device compatibility.
test('pointer-lock rejection stays paused and allows a genuine retry',async({page})=>{
 await page.goto('/courtyard.html?sample=1');await page.getByRole('button',{name:'进入庭院',exact:true}).waitFor();
 await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.requestPointerLock;(window as any).restoreLock=()=>HTMLCanvasElement.prototype.requestPointerLock=original;HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.reject(new DOMException('Synthetic rejection','NotAllowedError'));});
 await page.getByRole('button',{name:'进入庭院',exact:true}).click();await expect(page.getByRole('heading',{name:'世界已暂停'})).toBeVisible();await expect(page.locator('#notification')).toContainText('未能锁定鼠标');expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();
 await page.evaluate(()=>(window as any).restoreLock());await page.getByRole('button',{name:'继续探索',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await expect.poll(()=>page.evaluate(()=>!!document.pointerLockElement)).toBe(true);
});

test('loss of the actual WebGL context cannot resume an invalid scene',async({page})=>{
 await page.goto('/courtyard.html');await page.getByRole('button',{name:'进入庭院',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
 const supported=await page.evaluate(()=>{const gl=document.querySelector('canvas')!.getContext('webgl2')!,extension=gl.getExtension('WEBGL_lose_context');extension?.loseContext();return !!extension;});expect(supported).toBe(true);
 await expect(page.getByRole('heading',{name:'庭院暂时无法继续'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'庭院暂时无法继续'})).toBeVisible();await expect(page.getByRole('button',{name:'继续探索',exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.pointerLockElement)).toBeNull();
 await page.getByRole('button',{name:'重新加载',exact:true}).click();await expect(page.getByRole('button',{name:'进入庭院',exact:true})).toBeVisible();
});
