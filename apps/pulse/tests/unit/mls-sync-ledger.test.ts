import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';

const {
  mockBridgeGetListingStream,
  mockBridgeGetListings,
  mockBridgeGetListingById,
  mockSyncPropertyToIntelligenceGrid,
} = vi.hoisted(() => ({
  mockBridgeGetListingStream: vi.fn(),
  mockBridgeGetListings: vi.fn(),
  mockBridgeGetListingById: vi.fn(),
  mockSyncPropertyToIntelligenceGrid: vi.fn(),
}));

vi.mock('@/lib/core/requests', () => ({
  fetchProperty: vi.fn(),
}));

vi.mock('@/lib/intelligence/propertySync', () => ({
  syncPropertyToIntelligenceGrid: mockSyncPropertyToIntelligenceGrid,
}));

vi.mock('@/lib/data/bridgeMls', () => ({
  bridgeMlsService: {
    provider: 'bridge',
    getListingStream: mockBridgeGetListingStream,
    getListings: mockBridgeGetListings,
    getListingById: mockBridgeGetListingById,
  },
}));

vi.mock('@/lib/data/repliersMls', () => ({
  repliersMlsService: {
    provider: 'repliers',
    getListingStream: vi.fn(),
    getListings: vi.fn(),
    getListingById: vi.fn(),
  },
}));

import {
  beginMlsSyncRun,
  finishMlsSyncRun,
  getMlsSyncSnapshot,
  listMlsSyncRuns,
  recordMlsSyncListing,
  reloadMlsSyncLedgerForTests,
  resetMlsSyncLedgerForTests,
} from '@/lib/data/mlsSyncLedger';
import { MLSService } from '@/lib/data/mls';
import { importHotsheetText, parseHotsheetText } from '@/lib/data/hotsheetMls';
import { GET as mlsStatusGET } from '@/app/api/admin/mls/status/route';
import { POST as mlsSyncPOST } from '@/app/api/admin/mls/sync/route';

const previousLedgerPath = process.env.MLS_SYNC_LEDGER_PATH;
const previousRepliersKey = process.env.REPLIERS_API_KEY;
let tempDir = '';

beforeEach(() => {
  vi.clearAllMocks();
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mls-sync-ledger-test-'));
  process.env.MLS_SYNC_LEDGER_PATH = path.join(tempDir, 'runs.json');
  delete process.env.REPLIERS_API_KEY;
  reloadMlsSyncLedgerForTests();
  resetMlsSyncLedgerForTests();
});

afterEach(() => {
  resetMlsSyncLedgerForTests();
  reloadMlsSyncLedgerForTests();
  restoreEnv('MLS_SYNC_LEDGER_PATH', previousLedgerPath);
  restoreEnv('REPLIERS_API_KEY', previousRepliersKey);
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  tempDir = '';
});

describe('MLS sync ledger', () => {
  it('persists sync runs and reloads them from disk', () => {
    const run = beginMlsSyncRun({
      provider: 'bridge',
      params: {
        city: 'Dallas',
        access_token: 'secret-token',
        pageSize: 20,
      },
    });

    recordMlsSyncListing(run.id, {
      listing: makeListing('MLS-1'),
      outcome: 'synced',
    });
    finishMlsSyncRun(run.id);

    reloadMlsSyncLedgerForTests();

    const [persisted] = listMlsSyncRuns();
    expect(persisted).toMatchObject({
      id: run.id,
      provider: 'bridge',
      status: 'completed',
      params: {
        city: 'Dallas',
        pageSize: 20,
      },
      metrics: {
        received: 1,
        synced: 1,
        skipped: 0,
        failed: 0,
      },
    });
    expect(persisted.params).not.toHaveProperty('access_token');
    expect(persisted.completedAt).toEqual(expect.any(String));
    expect(persisted.durationMs).toEqual(expect.any(Number));
  });

  it('records skipped and failed listing outcomes with failure context', () => {
    const run = beginMlsSyncRun({ provider: 'repliers' });

    recordMlsSyncListing(run.id, {
      listing: makeListing('MLS-SKIP'),
      outcome: 'skipped',
    });
    recordMlsSyncListing(run.id, {
      listing: makeListing('MLS-FAIL', 'Breakage Road'),
      outcome: 'failed',
      error: new Error('Mongo unavailable'),
    });

    const finished = finishMlsSyncRun(run.id);

    expect(finished?.metrics).toEqual({
      received: 2,
      synced: 0,
      skipped: 1,
      failed: 1,
    });
    expect(finished?.failures[0]).toMatchObject({
      mls_id: 'MLS-FAIL',
      name: 'Breakage Road',
      error: 'Mongo unavailable',
    });
  });
});

describe('MLSService sync runner', () => {
  it('records synced, skipped, and failed items while continuing the run', async () => {
    mockBridgeGetListingStream.mockImplementation(async function* () {
      yield makeListing('MLS-SYNC', 'Synced Lane');
      yield makeListing('MLS-SKIP', 'Skipped Circle');
      yield makeListing('MLS-FAIL', 'Failed Court');
    });
    mockSyncPropertyToIntelligenceGrid
      .mockResolvedValueOnce({ _id: 'mongo-1' })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('write failed'));

    const run = await MLSService.getInstance().syncListings({ city: 'Dallas', apiKey: 'secret' });

    expect(run).toMatchObject({
      provider: 'bridge',
      status: 'completed',
      params: { city: 'Dallas' },
      metrics: {
        received: 3,
        synced: 1,
        skipped: 1,
        failed: 1,
      },
    });
    expect(run.params).not.toHaveProperty('apiKey');
    expect(run.failures[0]).toMatchObject({
      mls_id: 'MLS-FAIL',
      error: 'write failed',
    });
    expect(mockSyncPropertyToIntelligenceGrid).toHaveBeenCalledTimes(3);
  });

  it('marks provider-level stream failures as failed runs', async () => {
    mockBridgeGetListingStream.mockImplementation(async function* () {
      yield makeListing('MLS-SYNC', 'Synced Lane');
      throw new Error('provider timeout');
    });
    mockSyncPropertyToIntelligenceGrid.mockResolvedValueOnce({ _id: 'mongo-1' });

    await expect(MLSService.getInstance().syncListings({ city: 'Dallas' })).rejects.toThrow('provider timeout');

    const snapshot = getMlsSyncSnapshot();
    expect(snapshot.latest).toMatchObject({
      provider: 'bridge',
      status: 'failed',
      metrics: {
        received: 1,
        synced: 1,
        skipped: 0,
        failed: 0,
      },
    });
    expect(snapshot.latest?.failures[0].error).toBe('provider timeout');
  });
});

describe('MLS operator routes', () => {
  it('serves the current MLS sync status to local operators', async () => {
    const run = beginMlsSyncRun({ provider: 'bridge', params: { city: 'Dallas' } });
    finishMlsSyncRun(run.id);

    const response = await mlsStatusGET(new NextRequest('http://localhost:3002/api/admin/mls/status'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: {
        endpoint: '/api/admin/mls/status',
        provider: 'bridge',
        sync: {
          latest: {
            id: run.id,
            provider: 'bridge',
            status: 'completed',
          },
        },
      },
    });
  });

  it('runs a manual MLS sync with validated operator params', async () => {
    mockBridgeGetListingStream.mockImplementation(async function* () {
      yield makeListing('MLS-ROUTE', 'Route Street');
    });
    mockSyncPropertyToIntelligenceGrid.mockResolvedValueOnce({ _id: 'mongo-route' });

    const response = await mlsSyncPOST(new NextRequest('http://localhost:3002/api/admin/mls/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        params: {
          city: 'Dallas',
          pageSize: 1,
        },
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockBridgeGetListingStream).toHaveBeenCalledWith({
      city: 'Dallas',
      pageSize: 1,
    });
    expect(await response.json()).toMatchObject({
      success: true,
      data: {
        endpoint: '/api/admin/mls/sync',
        provider: 'bridge',
        run: {
          metrics: {
            received: 1,
            synced: 1,
            skipped: 0,
            failed: 0,
          },
        },
      },
    });
  });

  it('imports hotsheet text through the same MLS sync route and ledger', async () => {
    mockSyncPropertyToIntelligenceGrid.mockResolvedValueOnce({ _id: 'mongo-hot' });

    const response = await mlsSyncPOST(new NextRequest('http://localhost:3002/api/admin/mls/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'hotsheet',
        label: 'Daily morning hotsheet',
        text: HOTSHEET_TEXT,
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockSyncPropertyToIntelligenceGrid).toHaveBeenCalledWith(expect.objectContaining({
      mls_id: '20481234',
      name: '123 Maple Street',
      source: 'MLS',
      metadata: expect.objectContaining({ provider: 'hotsheet' }),
    }));
    expect(await response.json()).toMatchObject({
      success: true,
      data: {
        provider: 'hotsheet',
        parsedCount: 1,
        run: {
          provider: 'hotsheet',
          metrics: {
            received: 1,
            synced: 1,
            skipped: 0,
            failed: 0,
          },
        },
      },
    });
  });
});

describe('hotsheet MLS importer', () => {
  it('parses hotsheet text into normalized MLS listings', () => {
    const [listing] = parseHotsheetText(HOTSHEET_TEXT);

    expect(listing).toMatchObject({
      mls_id: '20481234',
      name: '123 Maple Street',
      type: 'Residential Sale',
      location: {
        city: 'Dallas',
        state: 'TX',
        zipcode: '75201',
      },
      beds: 3,
      baths: 2,
      list_price: 425000,
      price_type: 'sale',
      listing_status: 'Active',
      metadata: {
        provider: 'hotsheet',
      },
    });
  });

  it('records hotsheet imports in the sync ledger', async () => {
    mockSyncPropertyToIntelligenceGrid.mockResolvedValueOnce({ _id: 'mongo-hot' });

    const result = await importHotsheetText(HOTSHEET_TEXT, { label: 'unit-test' });

    expect(result.listings).toHaveLength(1);
    expect(result.run).toMatchObject({
      provider: 'hotsheet',
      status: 'completed',
      params: { label: 'unit-test' },
      metrics: {
        received: 1,
        synced: 1,
        skipped: 0,
        failed: 0,
      },
    });
  });

  it('rejects oversized hotsheet imports before creating a run', async () => {
    const oversized = Array.from({ length: 501 }, (_, index) => `
${index} Test Street
Dallas, TX 75201
MLS# LIMIT-${index} - Residential Sale
Active
$425,000
`).join('\n');

    await expect(importHotsheetText(oversized)).rejects.toThrow('500-listing import limit');
    expect(listMlsSyncRuns()).toHaveLength(0);
  });
});

function makeListing(mlsId: string, name = 'Test Listing') {
  return {
    _id: mlsId,
    name,
    type: 'Residential',
    location: {
      street: name,
      city: 'Dallas',
      state: 'TX',
      zipcode: '75201',
    },
    source: 'MLS' as const,
    mls_id: mlsId,
    listing_status: 'Active',
    last_updated: '2026-06-18T12:00:00.000Z',
  };
}

const HOTSHEET_TEXT = `
123 Maple Street
Dallas, TX 75201
MLS# 20481234 - Residential Sale
Active
$425,000
Beds: 3
Baths: 2
DOM: 12
Subdivision Name - Oak Lawn
County Or Parish - Dallas
Hotsheet Date: 2026-06-18
`;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
