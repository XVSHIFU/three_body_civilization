import {test,expect} from '@playwright/test';
test('entry rotates only on a new visit and manual selection survives reload',async({page})=>{
 await page.goto('/');await expect(page.getByRole('button',{name:'开始观测',exact:true})).toBeEnabled();await expect(page.locator('main.app')).toHaveClass(/theme-a/);
 await page.reload();await expect(page.getByRole('button',{name:'开始观测',exact:true})).toBeEnabled();await expect(page.locator('main.app')).toHaveClass(/theme-b/);
 await page.getByRole('button',{name:'文明档案',exact:true}).click();await page.getByRole('button',{name:'关闭面板',exact:true}).click();await expect(page.locator('main.app')).toHaveClass(/theme-b/);
 await page.reload();await expect(page.getByRole('button',{name:'开始观测',exact:true})).toBeEnabled();await expect(page.locator('main.app')).toHaveClass(/theme-c/);
 await page.screenshot({path:'.handoff-local/entry-rotation.png'});
 await page.getByRole('button',{name:'B',exact:true}).click();await expect(page.locator('main.app')).toHaveClass(/theme-b/);
 await page.reload();await expect(page.getByRole('button',{name:/开始观测|继续观测/})).toBeEnabled();await expect(page.locator('main.app')).toHaveClass(/theme-b/);
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('每次进入首页轮换主题').check();await page.reload();await expect(page.getByRole('button',{name:/开始观测|继续观测/})).toBeEnabled();await expect(page.locator('main.app')).toHaveClass(/theme-c/);
});
