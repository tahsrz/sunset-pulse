import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SellerProgressPublisher } from '@/components/realtor/SellerProgressPublisher';

afterEach(() => cleanup());

function renderPublisher(onPublish = vi.fn(async () => true)) {
  render(<SellerProgressPublisher savedPublication={null} availableMilestones={['consultation_held']} checklist={[{ id: '11111111-1111-4111-8111-111111111111', title: 'Review disclosures', done: true }]} documents={[{ label: 'Disclosure packet', url: 'https://example.com/disclosures.pdf' }]} disabled={false} busy={false} saveBlocked={false} error="" onClearError={vi.fn()} onPublish={onPublish} />);
  return onPublish;
}

describe('seller progress publisher', () => {
  it('returns to the editor and invalidates approval after a preview is edited',()=>{
    const onPublish=renderPublisher();
    fireEvent.click(screen.getByRole('button',{name:'Review client update'}));
    fireEvent.change(screen.getByRole('textbox',{name:'Client summary'}),{target:{value:'First preview'}});
    fireEvent.click(screen.getByRole('checkbox',{name:'Consultation held'}));
    fireEvent.click(screen.getByRole('checkbox',{name:/Review disclosures/}));
    fireEvent.click(screen.getByRole('checkbox',{name:/Disclosure packet/}));
    fireEvent.click(screen.getByRole('button',{name:'Preview exact update'}));
    fireEvent.click(screen.getByRole('checkbox',{name:'I reviewed this exact client update and its document links.'}));
    expect(screen.getByRole('button',{name:'Publish reviewed update'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'Back to edit'}));
    expect(screen.getByRole('textbox',{name:'Client summary'})).toHaveValue('First preview');
    expect(screen.getByRole('checkbox',{name:'Consultation held'})).toBeChecked();
    expect(screen.getByRole('checkbox',{name:/Review disclosures/})).toBeChecked();
    expect(screen.getByRole('checkbox',{name:/Disclosure packet/})).toBeChecked();
    fireEvent.change(screen.getByRole('textbox',{name:'Client summary'}),{target:{value:'Edited update'}});
    fireEvent.click(screen.getByRole('button',{name:'Preview exact update'}));
    expect(screen.getByRole('checkbox',{name:'I reviewed this exact client update and its document links.'})).not.toBeChecked();
    expect(screen.getByRole('button',{name:'Publish reviewed update'})).toBeDisabled();
    expect(onPublish).not.toHaveBeenCalled();
  });
  it('shows the exact selected client update and publishes only after review', async () => {
    const onPublish = renderPublisher();
    fireEvent.click(screen.getByRole('button', { name: 'Review client update' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Client summary' }), { target: { value: 'We are ready for the consultation.' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Consultation held' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Review disclosures/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Disclosure packet/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview exact update' }));

    const preview = screen.getByRole('region', { name: 'Client update preview' });
    expect(preview).toHaveTextContent('We are ready for the consultation.');
    expect(preview).toHaveTextContent('Consultation held');
    expect(preview).toHaveTextContent('Review disclosures');
    expect(preview).toHaveTextContent('Disclosure packet');
    expect(onPublish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I reviewed this exact client update and its document links.' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Publish reviewed update' })); });

    expect(onPublish).toHaveBeenCalledWith({ summary: 'We are ready for the consultation.', milestones: ['consultation_held'], checklist: [{ id: '11111111-1111-4111-8111-111111111111', title: 'Review disclosures', done: true }], documents: [{ label: 'Disclosure packet', url: 'https://example.com/disclosures.pdf' }] });
  });

  it('moves a dirty save request to preview without publishing', async () => {
    const onPublish = renderPublisher();
    fireEvent.click(screen.getByRole('button', { name: 'Review client update' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Client summary' }), { target: { value: 'A private draft summary.' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save changes' })); });

    expect(screen.getByRole('region', { name: 'Client update preview' })).toHaveTextContent('A private draft summary.');
    expect(onPublish).not.toHaveBeenCalled();
  });
});
