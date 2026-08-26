import os from 'os';
import path from 'path';

export function remoteAtlasCacheDir() {
  return path.join(os.tmpdir(), 'sunset-pulse-atlas');
}
