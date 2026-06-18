import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const {
  mockGetSessionUser,
  mockGetOrchestratorSnapshot,
  mockRouteOrchestratorCommand,
  mockRunOrchestratorBrowserCheck,
  mockHandleTerminalIntentAction,
  mockCreateServerClient,
} = vi.hoisted(() => ({
  mockGetSessionUser: vi.fn(),
  mockGetOrchestratorSnapshot: vi.fn(),
  mockRouteOrchestratorCommand: vi.fn(),
  mockRunOrchestratorBrowserCheck: vi.fn(),
  mockHandleTerminalIntentAction: vi.fn(),
  mockCreateServerClient: vi.fn(),
}));

vi.mock('@/lib/core/getSessionUser', () => ({
  getSessionUser: mockGetSessionUser,
}));

vi.mock('@/lib/core/orchestrator_node', () => ({
  getOrchestratorSnapshot: mockGetOrchestratorSnapshot,
  runOrchestratorBrowserCheck: mockRunOrchestratorBrowserCheck,
}));

vi.mock('@/lib/core/orchestrator_commands', () => ({
  routeOrchestratorCommand: mockRouteOrchestratorCommand,
}));

vi.mock('@/lib/core/orchestrator_terminal_runner', () => ({
  handleTerminalIntentAction: mockHandleTerminalIntentAction,
}));

vi.mock('@/lib/command-center/commandRouter', () => ({
  runCommandCenterCommand: vi.fn(() => ({
    ok: true,
    trace: {
      commandPost: { status: 'standby' },
    },
  })),
}));

vi.mock('@/lib/command-center/relayTemplates', () => ({
  listTahRelayFormats: vi.fn(() => []),
  listTahRelayTemplates: vi.fn(() => []),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

import { POST as browserCheckPOST } from '@/app/api/admin/orchestrator/browser-check/route';
import { POST as commandPOST } from '@/app/api/admin/orchestrator/command/route';
import { GET as statusGET } from '@/app/api/admin/orchestrator/status/route';
import { POST as terminalIntentPOST } from '@/app/api/admin/orchestrator/terminal-intents/[id]/route';
import { POST as commandCenterPOST } from '@/app/api/commands/route';
import { updateSession } from '@/utils/supabase/middleware';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  setNodeEnv('development');

  mockGetSessionUser.mockResolvedValue(null);
  mockGetOrchestratorSnapshot.mockReturnValue({
    masterArchive: { status: 'ready', sourceCount: 2, shardCount: 3 },
    commandQueue: { pendingTerminalIntentCount: 1 },
    commandRouter: { modes: [{ mode: 'console' }, { mode: 'telegram' }] },
  });
  mockRouteOrchestratorCommand.mockReturnValue({
    ok: true,
    action: 'status',
    reply: 'all systems nominal',
  });
  mockRunOrchestratorBrowserCheck.mockReturnValue({ ok: true });
  mockHandleTerminalIntentAction.mockResolvedValue({
    ok: true,
    message: 'approved',
    intent: { id: 'intent-1', status: 'approved' },
  });
  mockCreateServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  });
});

describe('Command Post access boundary', () => {
  it.each([
    ['status', () => statusGET(makeNextRequest('https://sunsetpulse.app/api/admin/orchestrator/status', {
      host: 'localhost:3002',
    }))],
    ['browser check', () => browserCheckPOST(makeNextRequest('https://sunsetpulse.app/api/admin/orchestrator/browser-check', {
      host: 'localhost:3002',
      method: 'POST',
    }))],
    ['command router', () => commandPOST(makeNextRequest('https://sunsetpulse.app/api/admin/orchestrator/command', {
      host: 'localhost:3002',
      method: 'POST',
      body: { text: '/status' },
    }))],
    ['terminal intent', () => terminalIntentPOST(
      makeNextRequest('https://sunsetpulse.app/api/admin/orchestrator/terminal-intents/intent-1', {
        host: 'localhost:3002',
        method: 'POST',
        body: { action: 'approve' },
      }),
      { params: Promise.resolve({ id: 'intent-1' }) }
    )],
  ])('denies the %s endpoint in production even when the Host header says localhost', async (_label, sendRequest) => {
    setNodeEnv('production');

    const response = await sendRequest();

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: true,
      message: 'Operator console requires local access or an authorized account.',
    });
    expect(mockGetOrchestratorSnapshot).not.toHaveBeenCalled();
    expect(mockRouteOrchestratorCommand).not.toHaveBeenCalled();
    expect(mockRunOrchestratorBrowserCheck).not.toHaveBeenCalled();
    expect(mockHandleTerminalIntentAction).not.toHaveBeenCalled();
  });

  it('allows an authenticated operator to use the command endpoint in production', async () => {
    setNodeEnv('production');
    mockGetSessionUser.mockResolvedValue(makeSession('operator'));

    const response = await commandPOST(makeNextRequest('https://sunsetpulse.app/api/admin/orchestrator/command', {
      host: 'sunsetpulse.app',
      method: 'POST',
      body: { text: '/status' },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: {
        endpoint: '/api/admin/orchestrator/command',
        result: { ok: true, action: 'status' },
      },
    });
    expect(mockRouteOrchestratorCommand).toHaveBeenCalledWith(expect.objectContaining({
      text: '/status',
      source: 'console',
      access: expect.objectContaining({ mode: 'authenticated' }),
    }));
  });

  it('allows a private LAN development host to use the browser-check endpoint', async () => {
    const response = await browserCheckPOST(makeNextRequest('http://192.168.1.20:3002/api/admin/orchestrator/browser-check', {
      method: 'POST',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: {
        endpoint: '/api/admin/orchestrator/browser-check',
        check: { ok: true },
      },
    });
  });

  it('denies public development hosts without authentication', async () => {
    const response = await statusGET(makeNextRequest('https://preview.sunsetpulse.test/api/admin/orchestrator/status', {
      host: 'preview.sunsetpulse.test',
    }));

    expect(response.status).toBe(403);
  });

  it('rejects unsupported terminal intent actions after access is granted', async () => {
    const response = await terminalIntentPOST(
      makeNextRequest('http://localhost:3002/api/admin/orchestrator/terminal-intents/intent-1', {
        method: 'POST',
        body: { action: 'launch' },
      }),
      { params: Promise.resolve({ id: 'intent-1' }) }
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: true,
      message: 'Unsupported terminal intent action.',
    });
    expect(mockHandleTerminalIntentAction).not.toHaveBeenCalled();
  });

  it('runs terminal intent actions with the authenticated operator identity', async () => {
    setNodeEnv('production');
    mockGetSessionUser.mockResolvedValue(makeSession('admin'));

    const response = await terminalIntentPOST(
      makeNextRequest('https://sunsetpulse.app/api/admin/orchestrator/terminal-intents/intent-1', {
        host: 'sunsetpulse.app',
        method: 'POST',
        body: { action: 'approve' },
      }),
      { params: Promise.resolve({ id: 'intent-1' }) }
    );

    expect(response.status).toBe(200);
    expect(mockHandleTerminalIntentAction).toHaveBeenCalledWith({
      id: 'intent-1',
      action: 'approve',
      operator: 'operator@sunset.test',
    });
  });

  it('marks the Command Center trace as access_denied for spoofed localhost in production', async () => {
    setNodeEnv('production');

    const response = await commandCenterPOST(makeNextRequest('https://sunsetpulse.app/api/commands', {
      host: 'localhost:3002',
      method: 'POST',
      body: { command: '/status' },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      trace: {
        commandPost: {
          status: 'access_denied',
          accessMode: 'denied',
        },
      },
    });
    expect(mockRouteOrchestratorCommand).not.toHaveBeenCalled();
  });
});

describe('Command Post middleware bypass', () => {
  it('redirects anonymous production /admin/orchestrator requests even with spoofed localhost', async () => {
    setNodeEnv('production');

    const response = await updateSession(makeNextRequest('https://sunsetpulse.app/admin/orchestrator', {
      host: 'localhost:3002',
    }), testNextResponse);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://sunsetpulse.app/login');
  });

  it('allows anonymous development /admin/orchestrator requests from private LAN hosts', async () => {
    const response = await updateSession(makeNextRequest('http://192.168.1.20:3002/admin/orchestrator'), testNextResponse);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects anonymous development /admin/orchestrator requests from public hosts', async () => {
    const response = await updateSession(makeNextRequest('https://preview.sunsetpulse.test/admin/orchestrator'), testNextResponse);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://preview.sunsetpulse.test/login');
  });
});

function makeNextRequest(url: string, init: { host?: string; method?: string; body?: unknown } = {}) {
  return new NextRequest(url, {
    method: init.method || 'GET',
    headers: init.host ? { host: init.host, 'content-type': 'application/json' } : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

function makeSession(role: string) {
  return {
    userId: 'operator-1',
    role,
    user: {
      id: 'operator-1',
      name: 'Operator One',
      email: 'operator@sunset.test',
      role,
    },
  };
}

function testNextResponse() {
  return new Response(null, { status: 200 });
}

function setNodeEnv(value: NodeJS.ProcessEnv['NODE_ENV']) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}
