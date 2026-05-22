import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/tah/forge/route';
import { TAHBuilder } from '@/lib/core/tah_builder';
import { MemoriaRetriever } from '@/lib/core/memoria_retriever';

const previousOutputDir = process.env.PULSE_FORGE_OUTPUT_DIR;

afterEach(() => {
  if (previousOutputDir === undefined) {
    delete process.env.PULSE_FORGE_OUTPUT_DIR;
  } else {
    process.env.PULSE_FORGE_OUTPUT_DIR = previousOutputDir;
  }
});

describe('TAH forge route', () => {
  it('creates a TAH cartridge from pasted text', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tah-forge-route-'));
    process.env.PULSE_FORGE_OUTPUT_DIR = dir;

    const response = await POST(jsonRequest({
      mode: 'tah',
      name: 'Route Notes',
      keywords: 'Dallas, zoning',
      text: 'Dallas zoning notes for infill research and land-use review.'
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('route_notes.tah');
    expect(fs.existsSync(path.join(dir, 'route_notes.tah'))).toBe(true);
  });

  it('creates a Memoria pair from uploaded TAH files', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tah-forge-route-'));
    process.env.PULSE_FORGE_OUTPUT_DIR = dir;
    const tah = new TAHBuilder().forge([
      { keywords: ['Bowie'], data: 'Bowie courthouse square and cattle-trade memory.' }
    ]);

    const response = await POST(jsonRequest({
      mode: 'memoria',
      name: 'Uploaded Memory',
      files: [{ name: 'bowie.tah', contentBase64: tah.toString('base64') }]
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.files.map((file: any) => file.name)).toEqual(['uploaded_memory.hat', 'uploaded_memory.tah']);

    const retriever = new MemoriaRetriever(path.join(dir, 'uploaded_memory.hat'));
    expect(retriever.search('Bowie courthouse', 5).some(result => result.data.includes('Bowie'))).toBe(true);
  });
});

function jsonRequest(body: any) {
  return new NextRequest('https://sunsetpulse.test/api/tah/forge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}
