import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import config from '@/config/marketing_copy.json';
import MarketingConfigPage from '@/app/admin/marketing/page';

const fetchMock = vi.fn();
const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  const NativeURL = URL;
  vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL, revokeObjectURL }));
  createObjectURL.mockReturnValue('blob:marketing-draft');
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fetchMock.mockResolvedValue({ ok: true, json: async () => config });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('marketing draft editor', () => {
  it('downloads all edits without posting or mutating the published data', async () => {
    render(<MarketingConfigPage />);
    fireEvent.change(await screen.findByLabelText('Hero Title'), { target: { value: 'A reviewed title' } });
    expect(screen.getByRole('link', { name: 'Check Content Readiness' })).toHaveAttribute('href', '/admin/marketing/readiness');
    fireEvent.change(screen.getByLabelText('Answer 1'), { target: { value: 'An edited answer.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download Draft' }));
    expect(screen.getByRole('status')).toHaveTextContent('The live site has not changed.');
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    let downloaded = '';
    await act(async () => { downloaded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(blob);
    }); });
    const data = JSON.parse(downloaded);
    expect(data.hero.title).toBe('A reviewed title');
    expect(data.faq.items[0].answer).toBe('An edited answer.');
    expect(data.cta).toEqual(config.cta);
    expect(config.hero.title).toBe('Sunset Pulse');
    expect(config.faq.items[0].answer).not.toBe('An edited answer.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('method', 'POST');
    fireEvent.change(screen.getByLabelText('Hero Title'), { target: { value: 'Another draft' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps invalid edits visible and prevents exporting them', async () => {
    render(<MarketingConfigPage />);
    fireEvent.change(await screen.findByLabelText('Hero Title'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download Draft' }));
    expect(screen.getByRole('alert')).toHaveTextContent('hero.title');
    expect(screen.getByLabelText('Hero Title')).toHaveValue('');
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('retains edits if the browser cannot start a download', async () => {
    createObjectURL.mockImplementationOnce(() => { throw new Error('download unavailable'); });
    render(<MarketingConfigPage />);
    fireEvent.change(await screen.findByLabelText('Hero Title'), { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download Draft' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Your edits are still here');
    expect(screen.getByLabelText('Hero Title')).toHaveValue('Keep this draft');
  });

  it('shows denied reads without rendering the editor and can retry a failed read', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    render(<MarketingConfigPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Site administrator access is required');
    expect(screen.queryByRole('button', { name: 'Download Draft' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(screen.getByLabelText('Hero Title')).toHaveValue(config.hero.title));
  });

  it('rejects a successful HTTP response containing malformed content', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ error: 'not content' }) });
    render(<MarketingConfigPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Marketing content is invalid');
    expect(screen.queryByLabelText('Hero Title')).not.toBeInTheDocument();
  });
});
