import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cmsPageDraftSchema } from '@/lib/cms/pages/pageSchema';
import { PagePresentationFields } from '@/app/vibes/pages/PagePresentationFields';
import { SunsetHeaderPart, SunsetFooterPart } from '@/lib/cms/themes/SunsetPageTemplate';
import { EditorialHeaderPart, EditorialFooterPart } from '@/lib/cms/themes/EditorialPageTemplate';
import type { CmsPageRenderContext } from '@/lib/cms/pages/renderContext';

const draft = cmsPageDraftSchema.parse({ title: 'Home', slug: 'home', presentation: { siteName: 'Sunset', homeLabel: 'Welcome', navigationLabel: 'Find your way', footerText: 'Local stories' } });
function Harness({ editorial = false }: { editorial?: boolean }) {
  const [value, setValue] = useState(draft);
  const context = { siteName: 'Default', page: { snapshot: value } } as CmsPageRenderContext;
  return <><PagePresentationFields draft={value} change={setValue} /><div data-testid="rendered">
    {editorial ? EditorialHeaderPart(context) : SunsetHeaderPart(context)}
    {editorial ? EditorialFooterPart(context) : SunsetFooterPart(context)}
  </div></>;
}
describe('editable page-specific navigation and footer links', () => {
  it.each([false, true])('renders edited labels immediately in either theme (editorial=%s)', editorial => {
    render(<Harness editorial={editorial} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add navigation link' }));
    const navigation = screen.getByRole('group', { name: 'Navigation links' });
    fireEvent.change(within(navigation).getByLabelText('Link 1 text'), { target: { value: 'Find a home' } });
    fireEvent.change(within(navigation).getByLabelText('Link 1 destination'), { target: { value: '/properties' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add footer link' }));
    const footer = screen.getByRole('group', { name: 'Footer links' });
    fireEvent.change(within(footer).getByLabelText('Link 1 text'), { target: { value: 'Visit the grill' } });
    fireEvent.change(within(footer).getByLabelText('Link 1 destination'), { target: { value: '/grill' } });
    const rendered = within(screen.getByTestId('rendered'));
    expect(rendered.getByRole('link', { name: 'Find a home' })).toHaveAttribute('href', '/properties');
    expect(rendered.getByRole('link', { name: 'Visit the grill' })).toHaveAttribute('href', '/grill');
    fireEvent.click(within(navigation).getByRole('button', { name: 'Remove link 1' }));
    expect(rendered.queryByRole('link', { name: 'Find a home' })).not.toBeInTheDocument();
  });
  it('keeps old presentation snapshots unchanged when link arrays are absent', () => {
    expect(cmsPageDraftSchema.parse(draft)).toEqual(draft);
    expect(draft.presentation?.navigationLinks).toBeUndefined();
  });
});
