import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.ts',workers:1,use:{baseURL:'http://localhost:8082',channel:'msedge',viewport:{width:390,height:844},deviceScaleFactor:2},reporter:'list'});
