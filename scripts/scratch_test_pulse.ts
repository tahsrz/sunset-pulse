import { pulseSyncWorker } from './apps/pulse/lib/data/pulse_sync_worker';
pulseSyncWorker.syncHotListings(2).then(console.log).catch(console.error);
