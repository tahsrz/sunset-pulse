import {defineConfig,devices} from '@playwright/test';

const origin=new URL(process.env.PULSE_RELEASE_ORIGIN || 'http://127.0.0.1:3187');
if(origin.protocol!=='http:' || !['localhost','127.0.0.1'].includes(origin.hostname)) throw new Error('Release browser acceptance requires a local HTTP server.');

export default defineConfig({
  testDir:'./tests',testMatch:['explorer-intelligence.spec.ts','explorer-production.spec.ts'],
  fullyParallel:false,workers:1,retries:0,reporter:'line',timeout:90000,
  outputDir:`.pulse-local/production-acceptance/playwright-${origin.port}-${process.env.PULSE_RELEASE_RUN_ID || 'manual'}`,
  use:{baseURL:origin.origin,actionTimeout:15000,trace:'off',screenshot:'only-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome'],launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}}}],
});
