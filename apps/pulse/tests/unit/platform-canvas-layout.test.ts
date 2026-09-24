import { describe, expect, it } from 'vitest';
import { canvasLayoutSchema, type CanvasLayout } from '@/lib/platform/contracts/canvasLayout';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const runId = '22222222-2222-4222-8222-222222222222';
const makeLayout = () => ({
  schemaVersion: 1,
  workspaceId,
  viewport: { x: 0, y: 0, zoom: 1 },
  windows: [{
    window: { id: '33333333-3333-4333-8333-333333333333', kind: 'run_graph', target: { workspaceId, runId } },
    x: 20, y: 30, width: 720, height: 520, zIndex: 1,
  }],
});

describe('spatial command-center layout contract', () => {
  it('accepts a bounded workspace-scoped run window without workflow state', () => {
    expect(canvasLayoutSchema.parse(makeLayout())).toEqual(makeLayout());
  });

  it('accepts only the reviewed window kinds and strict targets', () => {
    const layout = makeLayout();
    layout.windows[0].window = { id: layout.windows[0].window.id, kind: 'terminal', target: { workspaceId } } as never;
    expect(canvasLayoutSchema.safeParse(layout).success).toBe(false);

    const artifact = makeLayout() as CanvasLayout;
    artifact.windows[0].window = {
      id: artifact.windows[0].window.id, kind: 'artifact_viewer',
      target: { workspaceId, artifactId: runId, version: 2 },
    };
    expect(canvasLayoutSchema.safeParse(artifact).success).toBe(true);
  });

  it('rejects cross-workspace targets, arbitrary components, and extra workflow data', () => {
    const foreign = makeLayout();
    foreign.windows[0].window.target.workspaceId = '44444444-4444-4444-8444-444444444444';
    expect(canvasLayoutSchema.safeParse(foreign).success).toBe(false);

    const extra = makeLayout() as ReturnType<typeof makeLayout> & { runs?: unknown };
    extra.runs = [{ graph: { executable: 'should not be persisted' } }];
    expect(canvasLayoutSchema.safeParse(extra).success).toBe(false);
  });

  it('enforces unique IDs, window-count, viewport, and geometry bounds', () => {
    const duplicate = makeLayout();
    duplicate.windows.push(structuredClone(duplicate.windows[0]));
    expect(canvasLayoutSchema.safeParse(duplicate).success).toBe(false);

    const tooMany = makeLayout();
    tooMany.windows = Array.from({ length: 33 }, (_, index) => ({
      ...structuredClone(tooMany.windows[0]),
      window: { ...structuredClone(tooMany.windows[0].window), id: `33333333-3333-4333-8333-${String(index).padStart(12, '0')}` },
    }));
    expect(canvasLayoutSchema.safeParse(tooMany).success).toBe(false);

    const invalid = makeLayout();
    invalid.viewport.zoom = 3;
    invalid.windows[0].width = 100;
    expect(canvasLayoutSchema.safeParse(invalid).success).toBe(false);
  });
});
