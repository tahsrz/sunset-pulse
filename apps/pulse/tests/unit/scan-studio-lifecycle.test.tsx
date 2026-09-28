import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => <a href={href} {...props}>{children}</a>,
}));

import ScanStudioPage from '@/app/scan-studio/page';

const savedSession = {
  scanId: 'scan_saved',
  propertyAddress: '1612 Fair Oaks Drive, Westlake, TX',
  listingId: 'MLS-1',
  captureMode: 'guided_video',
  status: 'in_review',
  assets: [],
};

describe('Scan Studio lifecycle', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { sessions: [savedSession] } }) }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads saved sessions and resumes persisted property identity', async () => {
    render(<ScanStudioPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.getByDisplayValue(savedSession.propertyAddress)).toBeInTheDocument();
    expect(screen.getByText(/new captures will be added to this session/i)).toBeInTheDocument();
  });

  it('attaches the first camera stream after the video element exists and stops it cleanly', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    render(<ScanStudioPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    fireEvent.click(screen.getByRole('button', { name: /preview camera/i }));

    const video = await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledTimes(1);
      const element = document.querySelector('video') as HTMLVideoElement;
      expect(element.srcObject).toBe(stream);
      return element;
    });
    expect(video.hidden).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /stop camera/i }));
    expect(stop).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
  });
});
