import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {buildIdentity} from './tools/build-identity.js';
const identity=buildIdentity();
export default defineConfig({ plugins: [react()], define:{__BUILD_ID__:JSON.stringify(identity.buildId),__RUNTIME_ID__:JSON.stringify(identity.runtimeId)}, base: process.env.BASE_PATH || './', build: { chunkSizeWarningLimit: 2500, rollupOptions:{input:{main:'index.html',courtyard:'courtyard.html'}} } });
