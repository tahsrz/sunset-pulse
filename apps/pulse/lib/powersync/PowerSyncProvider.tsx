'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PowerSyncContext } from '@powersync/react';
import {
  PowerSyncDatabase,
  type SyncStatus,
  WASQLiteOpenFactory,
  WASQLiteVFS,
} from '@powersync/web';
import { useAuth } from '@/context/AuthContext';
import { SunsetPowerSyncConnector } from './connector';
import { SunsetPowerSyncSchema } from './schema';

export type PowerSyncHealth = {
  state: 'disabled' | 'initializing' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error';
  lastSyncedAt: string | null;
  pendingUploads: number;
};

type SunsetPowerSyncState = {
  database: PowerSyncDatabase | null;
  enabled: boolean;
  connected: boolean;
  error: Error | null;
  health: PowerSyncHealth;
};

const SunsetPowerSyncContext = createContext<SunsetPowerSyncState>({
  database: null,
  enabled: false,
  connected: false,
  error: null,
  health: { state: 'disabled', lastSyncedAt: null, pendingUploads: 0 },
});

let databaseSingleton: PowerSyncDatabase | null = null;

function getPowerSyncDatabase() {
  if (databaseSingleton) return databaseSingleton;
  if (typeof window === 'undefined') throw new Error('PowerSync can only initialize in the browser.');

  const multiTab = typeof SharedWorker !== 'undefined';
  databaseSingleton = new PowerSyncDatabase({
    schema: SunsetPowerSyncSchema,
    database: new WASQLiteOpenFactory({
      dbFilename: 'sunset-pulse.db',
      vfs: WASQLiteVFS.OPFSCoopSyncVFS,
      worker: '/@powersync/worker/WASQLiteDB.umd.js',
      flags: { enableMultiTabs: multiTab },
    }),
    flags: { enableMultiTabs: multiTab, disableSSRWarning: true },
    sync: { worker: '/@powersync/worker/SharedSyncImplementation.umd.js' },
  });
  return databaseSingleton;
}

export function SunsetPowerSyncProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const enabled = process.env.NEXT_PUBLIC_POWERSYNC_ENABLED === 'true'
    && Boolean(process.env.NEXT_PUBLIC_POWERSYNC_URL);
  const [database, setDatabase] = useState<PowerSyncDatabase | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [health, setHealth] = useState<PowerSyncHealth>({
    state: enabled ? 'initializing' : 'disabled',
    lastSyncedAt: null,
    pendingUploads: 0,
  });
  const connectedUser = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getPowerSyncDatabase().init()
      .then(() => {
        if (!cancelled) setDatabase(getPowerSyncDatabase());
      })
      .catch((reason) => {
        if (!cancelled) setError(asError(reason));
      });

    return () => { cancelled = true; };
  }, [enabled]);

  useEffect(() => {
    if (!database) return;
    let cancelled = false;

    async function updateStatus(status: SyncStatus) {
      const uploadQueue = await database.getUploadQueueStats().catch(() => ({ count: 0 }));
      if (cancelled) return;
      const syncError = status.dataFlowStatus.downloadError || status.dataFlowStatus.uploadError || null;
      const state: PowerSyncHealth['state'] = syncError
        ? 'error'
        : status.connecting
          ? 'connecting'
          : status.dataFlowStatus.downloading || status.dataFlowStatus.uploading
            ? 'syncing'
            : status.connected && status.hasSynced
              ? 'synced'
              : status.connected
                ? 'connecting'
                : 'offline';

      setConnected(status.connected);
      setHealth({
        state,
        lastSyncedAt: status.lastSyncedAt?.toISOString() || null,
        pendingUploads: uploadQueue.count,
      });
      setError(syncError);
    }

    const unregister = database.registerListener({ statusChanged: updateStatus });
    updateStatus(database.currentStatus);
    return () => {
      cancelled = true;
      unregister();
    };
  }, [database]);

  useEffect(() => {
    if (!enabled || !database || loading) return;
    let cancelled = false;

    async function reconcileConnection() {
      const userId = session?.user?.id || null;
      if (!userId) {
        await database.disconnectAndClear();
        connectedUser.current = null;
        if (!cancelled) {
          setConnected(false);
          setHealth({ state: 'offline', lastSyncedAt: null, pendingUploads: 0 });
        }
        return;
      }

      if (connectedUser.current && connectedUser.current !== userId) {
        await database.disconnectAndClear();
      }
      if (connectedUser.current !== userId) {
        await database.connect(new SunsetPowerSyncConnector());
        connectedUser.current = userId;
      }
      if (!cancelled) setError(null);
    }

    reconcileConnection().catch((reason) => {
      if (!cancelled) {
        setConnected(false);
        setError(asError(reason));
      }
    });

    return () => { cancelled = true; };
  }, [database, enabled, loading, session?.user?.id]);

  const value = { database, enabled, connected, error, health };
  const content = database
    ? <PowerSyncContext.Provider value={database}>{children}</PowerSyncContext.Provider>
    : children;

  return <SunsetPowerSyncContext.Provider value={value}>{content}</SunsetPowerSyncContext.Provider>;
}

export function useSunsetPowerSync() {
  return useContext(SunsetPowerSyncContext);
}

function asError(reason: unknown) {
  return reason instanceof Error ? reason : new Error(String(reason));
}
