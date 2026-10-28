import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AtlasGlobeCanvas, { type AtlasGlobe } from '@/components/atlas/AtlasGlobeCanvas';

const globe: AtlasGlobe = {
  generatedAt: '',
  source: '',
  progress: {
    targetNodes: 0,
    knownNodes: 0,
    plottedNodes: 0,
    mappedNodes: 0,
    unmappedNodes: 0,
    worldCompletion: 0,
    catalogCoverage: 0,
    averageCoverage: 0,
    indexedSnippets: 0,
    byteSize: 0,
    lastSwarmRunAt: null,
  },
  domains: [],
  nodes: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setupCanvas(reducedMotion: boolean) {
  let preference = reducedMotion;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
  };

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return preference; },
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  }));

  return {
    context,
    frames,
    setReducedMotion(value: boolean) {
      preference = value;
      listeners.forEach(listener => listener({ matches: value } as MediaQueryListEvent));
    },
    renderNextFrame() {
      const next = frames.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!next) throw new Error('No animation frame is scheduled');
      frames.delete(next[0]);
      act(() => next[1](0));
    },
  };
}

it('renders one still Atlas frame when reduced motion is enabled', () => {
  const canvas = setupCanvas(true);
  render(<AtlasGlobeCanvas globe={globe} showFeed={false} showMetrics={false} />);

  expect(canvas.frames.size).toBe(1);
  canvas.renderNextFrame();

  expect(canvas.context.clearRect).toHaveBeenCalledOnce();
  expect(canvas.frames.size).toBe(0);
});

it('stops and resumes the animation when the motion preference changes', () => {
  const canvas = setupCanvas(false);
  render(<AtlasGlobeCanvas globe={globe} showFeed={false} showMetrics={false} />);

  canvas.renderNextFrame();
  expect(canvas.frames.size).toBe(1);

  act(() => canvas.setReducedMotion(true));
  expect(canvas.frames.size).toBe(0);

  act(() => canvas.setReducedMotion(false));
  expect(canvas.frames.size).toBe(1);
});
