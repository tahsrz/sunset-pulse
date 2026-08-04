export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

const runtimeDir = path.resolve(process.cwd(), 'cartridges', 'lead-intel', 'tad');
const statePath = path.join(runtimeDir, 'latest-run.json');

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  return NextResponse.json({ ok: true, run: readRunState() });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  if (process.env.NODE_ENV === 'production' && process.env.LEAD_DISCOVERY_LOCAL_RUNNER !== 'true') {
    return NextResponse.json({ ok: false, error: 'The local discovery runner is disabled in production.' }, { status: 409 });
  }

  const current = readRunState();
  if (current?.status === 'running' && !runIsStale(current.startedAt)) {
    return NextResponse.json({ ok: false, error: 'A TAD discovery run is already active.', run: current }, { status: 409 });
  }

  fs.mkdirSync(runtimeDir, { recursive: true });
  const scriptPath = path.resolve(process.cwd(), 'scripts', 'run-tad-lead-discovery.ts');
  const tsxCli = path.resolve(process.cwd(), '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const stdout = fs.openSync(path.join(runtimeDir, 'discovery.out.log'), 'a');
  const stderr = fs.openSync(path.join(runtimeDir, 'discovery.err.log'), 'a');
  const child = spawn(process.execPath, [tsxCli, scriptPath, '--commit', '--limit', '25'], {
    cwd: process.cwd(),
    detached: true,
    windowsHide: true,
    stdio: ['ignore', stdout, stderr],
    env: process.env,
  });
  child.unref();
  fs.closeSync(stdout);
  fs.closeSync(stderr);

  return NextResponse.json({ ok: true, status: 'started', pid: child.pid }, { status: 202 });
}

function readRunState(): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as Record<string, any>;
  } catch {
    return null;
  }
}

function runIsStale(startedAt: unknown) {
  const timestamp = new Date(String(startedAt || '')).getTime();
  return !Number.isFinite(timestamp) || Date.now() - timestamp > 20 * 60 * 1000;
}
