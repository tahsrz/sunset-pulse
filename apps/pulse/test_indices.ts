import { getTahIndices } from './lib/core/tah_utils';
const m = 3840n;
const k = 14;
const indices = getTahIndices('fort worth', m, k);
console.log(indices.map(i => i.toString()).join(', '));
