import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { renderGlossaryText } from '@/components/glossary/GlossaryText';

describe('site glossary', () => {
  it('defines and links semantic terms to their source cartridges', () => {
    const markup = renderToStaticMarkup(
      React.createElement('p', null, renderGlossaryText('Code Concern CCS has PENDING status in a Dallas 311 Service Request.'))
    );

    expect(markup).toContain('href="/tah/dallas-community-intel"');
    expect(markup).toContain('Code Compliance Services');
    expect(markup).toContain('Source: dallas_community_intel.tah');
    expect(markup).toContain('Pending status');
    expect(markup).toContain('tracking record for a reported city issue');
  });

  it('leaves ordinary prose alone', () => {
    const markup = renderToStaticMarkup(
      React.createElement('p', null, renderGlossaryText('Call the client tomorrow morning.'))
    );

    expect(markup).toBe('<p>Call the client tomorrow morning.</p>');
  });
});
