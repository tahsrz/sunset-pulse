import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { GET as getMaster } from '@/app/api/tah/master/route';
import { GET as getMasterSearch, POST as postMasterSearch } from '@/app/api/tah/master/search/route';
import { GET as getMasterSources } from '@/app/api/tah/master/sources/route';
import { GET as getMasterPlaces } from '@/app/api/tah/master/places/route';
import { TAHBuilder } from '@/lib/core/tah_builder';
import { packPulseCatalog } from '@/lib/core/tah_packager';
import type { PulseCartridge } from '@/lib/ai/brain/pulse_query';

const previousMasterDir = process.env.PULSE_MASTER_ARCHIVE_DIR;
const previousMasterName = process.env.PULSE_MASTER_ARCHIVE_NAME;

afterEach(() => {
  restoreEnv('PULSE_MASTER_ARCHIVE_DIR', previousMasterDir);
  restoreEnv('PULSE_MASTER_ARCHIVE_NAME', previousMasterName);
});

describe('TAH master archive routes', () => {
  it('serves metadata for the generated master archive', async () => {
    const { outputDir } = createMasterFixture();
    process.env.PULSE_MASTER_ARCHIVE_DIR = outputDir;
    process.env.PULSE_MASTER_ARCHIVE_NAME = 'atlas_pulse_master_test';

    const response = await getMaster(new NextRequest('https://sunsetpulse.test/api/tah/master'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.archive).toEqual(
      expect.objectContaining({
        status: 'ready',
        name: 'atlas_pulse_master_test',
        sourceCount: 2,
        shardCount: 2
      })
    );
    expect(body.data.archive.files.hat.exists).toBe(true);
    expect(body.data.archive.sources.map((source: any) => source.slug)).toEqual(['dallas-notes', 'bowie-notes']);
  });

  it('searches the master archive with query parameters', async () => {
    const { outputDir } = createMasterFixture();
    process.env.PULSE_MASTER_ARCHIVE_DIR = outputDir;
    process.env.PULSE_MASTER_ARCHIVE_NAME = 'atlas_pulse_master_test';

    const response = await getMasterSearch(new NextRequest('https://sunsetpulse.test/api/tah/master/search?q=Deep%20Ellum&limit=5'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.query).toBe('Deep Ellum');
    expect(body.data.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'dallas_notes.tah',
          slug: 'dallas-notes',
          title: 'Dallas Notes',
          text: expect.stringContaining('Deep Ellum music corridors')
        })
      ])
    );
  });

  it('searches the master archive with POST bodies', async () => {
    const { outputDir } = createMasterFixture();
    process.env.PULSE_MASTER_ARCHIVE_DIR = outputDir;
    process.env.PULSE_MASTER_ARCHIVE_NAME = 'atlas_pulse_master_test';

    const response = await postMasterSearch(jsonRequest({
      query: 'Bowie courthouse',
      limit: 3
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.results[0]).toEqual(
      expect.objectContaining({
        source: 'bowie_notes.tah',
        slug: 'bowie-notes',
        text: expect.stringContaining('Bowie courthouse square')
      })
    );
  });

  it('pages through master archive sources', async () => {
    const { outputDir } = createMasterFixture();
    process.env.PULSE_MASTER_ARCHIVE_DIR = outputDir;
    process.env.PULSE_MASTER_ARCHIVE_NAME = 'atlas_pulse_master_test';

    const response = await getMasterSources(new NextRequest('https://sunsetpulse.test/api/tah/master/sources?q=dallas&limit=5'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.count).toBe(1);
    expect(body.data.sources[0]).toEqual(
      expect.objectContaining({
        slug: 'dallas-notes',
        name: 'dallas_notes.tah'
      })
    );
  });

  it('extracts Atlas Pulse places from packed master shards', async () => {
    const { outputDir } = createMasterFixture();
    process.env.PULSE_MASTER_ARCHIVE_DIR = outputDir;
    process.env.PULSE_MASTER_ARCHIVE_NAME = 'atlas_pulse_master_test';

    const response = await getMasterPlaces(new NextRequest('https://sunsetpulse.test/api/tah/master/places?limit=5'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'bowie',
          label: 'Bowie, Texas',
          region: 'Montague County',
          physicalAnchor: 'Bowie courthouse square',
          binding: 68,
          lat: 33.559,
          lng: -97.848
        })
      ])
    );
  });
});

function createMasterFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tah-master-routes-'));
  const outputDir = path.join(dir, 'master');
  const dallasPath = path.join(dir, 'dallas_notes.tah');
  const bowiePath = path.join(dir, 'bowie_notes.tah');
  const builder = new TAHBuilder();

  fs.writeFileSync(dallasPath, builder.forge([
    { keywords: ['Deep Ellum'], data: 'Deep Ellum music corridors and mural districts.' }
  ]));
  fs.writeFileSync(bowiePath, builder.forge([
    {
      keywords: ['Bowie'],
      data: 'PLACE: Bowie, Texas | SLUG: bowie | REGION: Montague County | PHYSICAL_ANCHOR: Bowie courthouse square | COORDINATES: 33.559, -97.848 | ATLAS_PULSE_BINDING: 68 | ATLAS_PULSE_STAGE: mapped | Bowie courthouse square and cattle trade history.'
    }
  ]));

  const cartridges: PulseCartridge[] = [
    {
      name: 'dallas_notes.tah',
      path: dallasPath,
      slug: 'dallas-notes',
      title: 'Dallas Notes',
      type: 'tah'
    },
    {
      name: 'bowie_notes.tah',
      path: bowiePath,
      slug: 'bowie-notes',
      title: 'Bowie Notes',
      type: 'tah'
    }
  ];

  packPulseCatalog({
    cartridges,
    outputDir,
    baseName: 'atlas_pulse_master_test'
  });

  return { outputDir };
}

function jsonRequest(body: any) {
  return new NextRequest('https://sunsetpulse.test/api/tah/master/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
