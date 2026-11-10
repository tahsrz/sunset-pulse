'use client';
import React, { Component, type ReactNode } from 'react';

export function MapUnavailable({ onRetry }: { onRetry: () => void }) {
  return <div className="flex h-full min-h-80 flex-col items-start justify-center gap-4 bg-slate-900 p-6 text-white" role="alert">
    <p>The map could not load. You can still browse the properties below or beside it.</p>
    <button className="rounded-lg border border-cyan-200 px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" onClick={onRetry}>Retry Map</button>
  </div>;
}

export class ExplorerMapBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <MapUnavailable onRetry={this.props.onRetry} /> : this.props.children;
  }
}
