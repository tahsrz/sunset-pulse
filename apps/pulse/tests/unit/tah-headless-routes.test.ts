import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getLlms } from '@/app/llms.txt/route';
import { GET as getTahHeadless } from '@/app/tah/headless/route';
import { GET as getTahIndex } from '@/app/tah/index.json/route';
import { GET as getCartridgeHeadless } from '@/app/tah/[slug]/headless/route';
import { GET as getCartridgeMeta } from '@/app/api/tah/[slug]/meta/route';
import { GET as getAtlasMap } from '@/app/api/tah/atlas/map/route';
import { GET as getAtlasManifest } from '@/app/api/tah/atlas/manifest/route';
import { GET as getAtlasProbe } from '@/app/api/tah/atlas/probe/route';
import { GET as getAtlasGlobe } from '@/app/api/tah/atlas/globe/route';
import { getCartridgeMetadata } from '@/lib/ai/brain/cartridge_metadata';
import { listPulseCartridges } from '@/lib/ai/brain/pulse_query';

const CANONICAL_HOST = 'https://sunsetpulse.app';
const PREVIEW_HOST = 'https://preview.sunsetpulse.test';

function getCatalogFixture() {
  const cartridge = listPulseCartridges()[0];
  if (!cartridge) throw new Error('Expected at least one TAH cartridge fixture.');
  return cartridge;
}

function getCatalogFixtureMetadata(host = CANONICAL_HOST) {
  return getCartridgeMetadata(getCatalogFixture(), host);
}

describe('TAH robot-facing routes', () => {
  it('serves the headless archive as plain text', async () => {
    const fixture = getCatalogFixtureMetadata();
    const response = getTahHeadless(new Request(`${CANONICAL_HOST}/tah/headless`));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toContain('TAH_ARCHIVE');
    expect(body).toContain('CATALOG_COUNT:');
    expect(body).toContain(`HEADLESS: ${fixture.routes.headless}`);
    expect(body).toMatch(/HEADLESS: https:\/\/sunsetpulse\.app\/tah\/[^/\s]+\/headless/);
  });

  it('serves cartridge headless pages as plain text', async () => {
    const fixture = getCatalogFixtureMetadata();
    const response = await getCartridgeHeadless(new Request(fixture.routes.headless), {
      params: { slug: fixture.slug }
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toContain('TAH_CARTRIDGE');
    expect(body).toContain(`SLUG: ${fixture.slug}`);
    expect(body).toContain(`QUERY_API: ${fixture.routes.api}`);
  });

  it('serves the dynamic JSON catalog with headless URLs', async () => {
    const fixture = getCatalogFixtureMetadata();
    const response = getTahIndex(new Request(`${CANONICAL_HOST}/tah/index.json`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.dynamic).toBe(true);
    expect(body.endpoints.headlessIndex).toBe('https://sunsetpulse.app/tah/headless');
    expect(body.cartridges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: fixture.slug,
          headlessUrl: fixture.routes.headless
        })
      ])
    );
  });

  it('serves per-cartridge metadata for robots and UI clients', async () => {
    const fixture = getCatalogFixtureMetadata();
    const response = await getCartridgeMeta(new NextRequest(fixture.routes.meta), {
      params: Promise.resolve({ slug: fixture.slug })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cartridge).toEqual(
      expect.objectContaining({
        slug: fixture.slug,
        title: fixture.title,
        domain: expect.objectContaining({ id: fixture.domain.id }),
        format: expect.any(String),
        searchQuery: fixture.searchQuery,
        routes: expect.objectContaining({
          headless: fixture.routes.headless,
          meta: fixture.routes.meta
        })
      })
    );
  });

  it('advertises headless and JSON entrances in llms.txt', async () => {
    const fixture = getCatalogFixtureMetadata(PREVIEW_HOST);
    const response = getLlms(new Request(`${PREVIEW_HOST}/llms.txt`, {
      headers: {
        host: 'preview.sunsetpulse.test',
        'x-forwarded-proto': 'https'
      }
    }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toContain(`[Headless TAH catalog](${PREVIEW_HOST}/tah/headless)`);
    expect(body).toContain(`[Dynamic TAH catalog JSON](${PREVIEW_HOST}/tah/index.json)`);
    expect(body).toContain(`[Atlas published manifest](${PREVIEW_HOST}/api/tah/atlas/manifest)`);
    expect(body).toContain(`[${fixture.title}](${fixture.routes.html})`);
    expect(body).toContain(`[headless](${fixture.routes.headless})`);
    expect(body).toContain(`[query](${fixture.routes.api})`);
  });

  it('serves the consolidated Atlas world map from the TAH catalog', async () => {
    const fixture = getCatalogFixtureMetadata();
    const response = getAtlasMap();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.progress.percent).toBeGreaterThan(0);
    expect(body.progress.percent).toBeLessThan(100);
    expect(body.progress.targetCartridges).toBe(1000);
    expect(body.progress.totalCartridges).toBeGreaterThan(0);
    expect(body.progress.stages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'seed', complete: true }),
        expect.objectContaining({ id: 'swarm', complete: false })
      ])
    );
    expect(body.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'world', type: 'world' }),
        expect.objectContaining({ id: `cartridge:${fixture.slug}`, type: 'cartridge' })
      ])
    );
    const webNode = body.nodes.find((node: any) => node.id.startsWith('cartridge:web-'));
    if (webNode) {
      expect(webNode.searchQuery).toBeTruthy();
      expect(webNode.searchQuery).not.toMatch(/^Web \d+$/);
      expect(webNode.apiUrl).toContain(encodeURIComponent(webNode.searchQuery));
    }
    expect(body.links.length).toBeGreaterThan(0);
  });

  it('serves progressive Atlas cartridge probes', async () => {
    const response = getAtlasProbe(new NextRequest('https://sunsetpulse.app/api/tah/atlas/probe?cursor=0&limit=3'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.cursor).toBe(0);
    expect(body.limit).toBe(3);
    expect(body.items).toHaveLength(3);
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        slug: expect.any(String),
        searchQuery: expect.any(String),
        byteSize: expect.any(Number),
        format: expect.any(String),
        summary: expect.any(String)
      })
    );
    expect(body.nextCursor).toBe(3);
  });

  it('serves an Atlas manifest for published local swarm maps', async () => {
    const response = getAtlasManifest();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.name).toBe('Atlas Pulse TAH Manifest');
    expect(body.total).toBeGreaterThan(0);
    expect(body.items.length).toBe(body.mapped);
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        slug: expect.any(String),
        searchQuery: expect.any(String)
      })
    );
  });

  it('serves a globe-native Atlas progress dataset', async () => {
    const fixture = getCatalogFixtureMetadata();
    const response = getAtlasGlobe();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.name).toBe('Atlas Pulse TAH Globe');
    expect(body.progress.worldCompletion).toBeGreaterThan(0);
    expect(body.progress.worldCompletion).toBeLessThan(100);
    expect(body.progress.knownNodes).toBeGreaterThan(0);
    expect(body.progress.plottedNodes).toBe(body.progress.knownNodes);
    expect(body.progress.targetNodes).toBe(1000);
    expect(body.domains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.domain.id,
          knownNodes: expect.any(Number),
          coverage: expect.any(Number)
        })
      ])
    );
    expect(body.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: fixture.slug,
          lat: expect.any(Number),
          lng: expect.any(Number),
          coordinateSource: expect.any(String),
          coverage: expect.any(Number),
          confidence: expect.any(Number),
          routes: expect.objectContaining({
            headless: fixture.routes.headless
          })
        })
      ])
    );
  });
});
