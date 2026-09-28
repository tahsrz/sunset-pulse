import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VibeProvider } from '@/context/VibeContext';

describe('VibeProvider hydration', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('does not insert browser-automation-only markup or force a different theme', () => {
    vi.stubGlobal('navigator', { webdriver: true });
    const tree=<VibeProvider><main>Account access</main></VibeProvider>;
    const html=renderToString(tree);
    expect(html).not.toContain('STATUS / MAXXING');
    const { container }=render(tree);
    expect(screen.getByText('Account access')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('default');
    expect(container.textContent).not.toContain('ROI-MAXXING');
  });
});
