import 'server-only';

import { randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import type { PropertyScanArtifactStore, PrivateArtifactWriteResult } from './propertyScanArtifactStore.server';

const PRIVATE_SCAN_KEY = /^private\/property-scans\/[a-f0-9]{32}\/[a-f0-9]{32}\/scan-op-[a-f0-9]{64}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.glb$/;

/**
 * Local-only filesystem adapter for disposable acceptance and self-hosted
 * development. It is not a production/serverless storage implementation.
 */
export function createLocalPropertyScanArtifactStore(
  rootDirectory: string,
  options: { maxObjectBytes: number },
): PropertyScanArtifactStore {
  if (!isAbsolute(rootDirectory)) throw new Error('Local artifact store root must be an absolute path.');
  if (!Number.isSafeInteger(options.maxObjectBytes) || options.maxObjectBytes < 1) {
    throw new Error('Local artifact store requires a positive maximum object size.');
  }
  const root = resolve(rootDirectory);

  function resolveObjectPath(objectKey: string) {
    if (!PRIVATE_SCAN_KEY.test(objectKey)) throw new Error('Artifact key is outside the private scan namespace.');
    const target = resolve(root, ...objectKey.split('/'));
    if (!target.startsWith(`${root}${sep}`)) throw new Error('Artifact key escapes the configured root.');
    return target;
  }

  return {
    async createIfAbsent({ objectKey, bytes }): Promise<PrivateArtifactWriteResult> {
      if (bytes.byteLength > options.maxObjectBytes) throw new Error('Artifact exceeds the configured local-store object limit.');
      const target = resolveObjectPath(objectKey);
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      const stagingPath = `${target}.${randomUUID()}.staging`;
      const file = await open(stagingPath, 'wx', 0o600);
      try {
        await file.writeFile(bytes);
        await file.sync();
      } catch (error) {
        await file.close().catch(() => undefined);
        await unlink(stagingPath).catch(() => undefined);
        throw error;
      }
      await file.close();

      try {
        // Publish only a complete, synced file. A hard link is atomic and
        // fails rather than replacing a concurrent writer's object.
        await link(stagingPath, target);
        return 'created';
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return 'already_exists';
        throw error;
      } finally {
        await unlink(stagingPath).catch((error) => {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        });
      }
    },
    async read(objectKey) {
      try {
        return await readFile(resolveObjectPath(objectKey));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
    async delete(objectKey) {
      try {
        await unlink(resolveObjectPath(objectKey));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    },
  };
}
