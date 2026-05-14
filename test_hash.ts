import { cityHash64 } from './lib/core/cityhash';
const buf = Buffer.from('fort worth', 'utf-8');
console.log(cityHash64(buf).toString());
