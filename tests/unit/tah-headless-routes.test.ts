import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getLlms } from '@/app/llms.txt/route';
import { GET as getTahHeadless } from '@/app/tah/headless/route';
import { GET as getTahIndex } from '@/app/tah/index.json/route';
import { GET as getCartridgeHeadless } from '@/app/tah/[slug]/headless/route';
import { GET as getAtlasMap } from '@/app/api/tah/atlas/map/route';
import { GET as getAtlasManifest } from '@/app/api/tah/atlas/manifest/route';
import { GET as getAtlasProbe } from '@/app/api/tah/atlas/probe/route';

describe('TAH robot-facing routes', () => {
  it('serves the headless archive as plain text', async () => {
    const response = getTahHeadless();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toContain('TAH_ARCHIVE');
    expect(body).toContain('CATALOG_COUNT:');
    expect(body).toContain('HEADLESS: https://sunsetpulse.com/tah/algorithms/headless');
  });

  it('serves cartridge headless pages as plain text', async () => {
    const response = await getCartridgeHeadless(new Request('https://sunsetpulse.com/tah/algorithms/headless'), {
      params: { slug: 'algorithms' }
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toContain('TAH_CARTRIDGE');
    expect(body).toContain('SLUG: algorithms');
    expect(body).toContain('QUERY_API: https://sunsetpulse.com/api/tah?q=Algorithms&limit=10');
  });

  it('serves the dynamic JSON catalog with headless URLs', async () => {
    const response = getTahIndex();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(body.dynamic).toBe(true);
    expect(body.endpoints.headlessIndex).toBe('https://sunsetpulse.com/tah/headless');
    expect(body.cartridges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'algorithms',
          headlessUrl: 'https://sunsetpulse.com/tah/algorithms/headless'
        })
      ])
    );
  });

  it('advertises headless and JSON entrances in llms.txt', async () => {
    const response = getLlms(new Request('https://preview.sunsetpulse.test/llms.txt', {
      headers: {
        host: 'preview.sunsetpulse.test',
        'x-forwarded-proto': 'https'
      }
    }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(body).toContain('[Headless TAH catalog](https://preview.sunsetpulse.test/tah/headless)');
    expect(body).toContain('[Dynamic TAH catalog JSON](https://preview.sunsetpulse.test/tah/index.json)');
    expect(body).toContain('[Atlas published manifest](https://preview.sunsetpulse.test/api/tah/atlas/manifest)');
    expect(body).toContain('[Algorithms](https://preview.sunsetpulse.test/tah/algorithms)');
    expect(body).toContain('[headless](https://preview.sunsetpulse.test/tah/algorithms/headless)');
    expect(body).toContain('[query](https://preview.sunsetpulse.test/api/tah?q=Algorithms&limit=10)');
  });

  it('serves the consolidated Atlas world map from the TAH catalog', async () => {
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
        expect.objectContaining({ id: 'web-captures', type: 'continent' }),
        expect.objectContaining({ id: 'cartridge:algorithms', type: 'cartridge' })
      ])
    );
    const webNode = body.nodes.find((node: any) => node.id.startsWith('cartridge:web-'));
    expect(webNode.searchQuery).toBeTruthy();
    expect(webNode.searchQuery).not.toMatch(/^Web \d+$/);
    expect(webNode.apiUrl).toContain(encodeURIComponent(webNode.searchQuery));
    expect(body.links.length).toBeGreaterThan(0);
  });

  it('serves progressive Atlas cartridge probes', async () => {
    const response = getAtlasProbe(new NextRequest('https://sunsetpulse.com/api/tah/atlas/probe?cursor=0&limit=3'));
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
    expect(body.name).toBe('Sunset Pulse TAH Atlas Manifest');
    expect(body.total).toBeGreaterThan(0);
    expect(body.items.length).toBe(body.mapped);
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'algorithms',
          searchQuery: 'Algorithms'
        })
      ])
    );
  });
});
