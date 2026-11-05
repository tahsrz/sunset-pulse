import {defineConfig,mergeConfig} from 'vitest/config';
import path from 'path';
import base from './vitest.config';

// Zod 3.25 bundles the v4 runtime. Exercise the future feature-stack boundary
// without changing the installed package or the app's default resolution.
const config=mergeConfig(base,defineConfig({
  resolve:{alias:{zod:path.resolve(__dirname,'../../node_modules/zod/v4/index.js')}},
}));
// mergeConfig concatenates include arrays, so replace the merged test pattern.
config.test={...config.test,include:['tests/unit/guided-journey-contract.test.ts']};
export default config;
