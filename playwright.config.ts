import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',fullyParallel:false,use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1366,height:768}},webServer:{command:'npm run preview -- --port 4173',port:4173,reuseExistingServer:!process.env.CI},projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'firefox',use:{browserName:'firefox'}}]});
