import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ connect: vi.fn(), binding: vi.fn(), context: vi.fn() }));
vi.mock('react', () => ({ cache: (fn: unknown) => fn }));
vi.mock('@/lib/core/database', () => ({ default: mocks.connect }));
vi.mock('@/lib/cms/pages/platformHomepageService', () => ({ readPlatformHomepageBinding: mocks.binding }));
vi.mock('@/lib/cms/pages/renderContext', () => ({ buildScopedCmsPageRenderContext: mocks.context }));
import { readPlatformHomepage } from '@/lib/cms/pages/platformHomepageReader';

describe('platform homepage public read', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'false'); mocks.connect.mockResolvedValue(undefined); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  it('uses the explicit live pointer, not current draft status', async () => {
    mocks.binding.mockResolvedValue({ enabled: true, tenantId: 'platform', siteId: 'site', pageId: 'home', publishedRevisionId: 'rev-3' });
    mocks.context.mockResolvedValue({ page: { snapshot: { title: 'Published title' } } });
    expect(await readPlatformHomepage()).toEqual({ page: { snapshot: { title: 'Published title' } } });
    expect(mocks.context).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'platform', siteId: 'site', pageId: 'home', publishedRevisionId: 'rev-3' }));
  });
  it.each([null, { enabled: false, publishedRevisionId: 'rev' }, { enabled: true }])('falls back for an absent or inactive publication: %j', async binding => {
    mocks.binding.mockResolvedValue(binding);
    expect(await readPlatformHomepage()).toBeNull(); expect(mocks.context).not.toHaveBeenCalled();
  });
  it('bounds fallback latency when the database is unresponsive', async () => {
    vi.useFakeTimers(); mocks.connect.mockReturnValue(new Promise(() => {}));
    const pending = readPlatformHomepage();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toBeNull(); expect(mocks.context).not.toHaveBeenCalled();
  });
  it('falls back for malformed or unavailable published content', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.connect.mockRejectedValue(new Error('unavailable'));
    expect(await readPlatformHomepage()).toBeNull();
  });
  it('does not access the database in mock mode', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    expect(await readPlatformHomepage()).toBeNull(); expect(mocks.connect).not.toHaveBeenCalled();
  });
});
