import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/contracts/templates/[formId]/preview/route';

describe('promulgated contract preview route', () => {
  it('serves an allowlisted local PDF inline', async () => {
    const response = await GET(new Request('http://localhost/api/contracts/templates/20-19/preview'), {
      params: Promise.resolve({ formId: '20-19' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('inline');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('returns a not-found response for forms without a local PDF', async () => {
    const response = await GET(new Request('http://localhost/api/contracts/templates/9-18/preview'), {
      params: Promise.resolve({ formId: '9-18' }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error).toContain('No PDF preview');
  });

  it('does not expose an unknown form identifier', async () => {
    const response = await GET(new Request('http://localhost/api/contracts/templates/not-a-form/preview'), {
      params: Promise.resolve({ formId: 'not-a-form' }),
    });

    expect(response.status).toBe(404);
  });
});
