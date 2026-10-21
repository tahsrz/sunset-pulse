import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SellerActionDrawer } from '@/components/realtor/SellerActionDrawer';

afterEach(() => cleanup());

function Harness({ save, saveBlocked = false }: { save: () => Promise<boolean>; saveBlocked?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('Saved note');
  const dirty = notes !== 'Saved note';
  return <>
    <button type="button" onClick={() => setOpen(true)}>Edit preparation</button>
    <output aria-label="Saved draft">{notes}</output>
    {open ? <SellerActionDrawer titleId="prepare-title" title="Edit preparation" description="Private case notes." dirty={dirty} busy={false} saveBlocked={saveBlocked}
      onClose={() => setOpen(false)} onSave={async () => { const saved = await save(); if (saved) setOpen(false); return saved; }}
      onDiscard={() => setNotes('Saved note')}>
      <label>Internal notes<input value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    </SellerActionDrawer> : null}
  </>;
}

describe('seller action drawer', () => {
  it('requires an explicit save, discard, or stay choice before closing a dirty draft', async () => {
    const save = vi.fn(async () => true);
    render(<Harness save={save} />);
    const trigger = screen.getByRole('button', { name: 'Edit preparation' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole('textbox', { name: 'Internal notes' }), { target: { value: 'Unsaved note' } });

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('alertdialog', { name: 'Save your changes before closing?' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep editing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('dialog', { name: 'Edit preparation' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Saved draft')).toHaveTextContent('Saved note');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(save).not.toHaveBeenCalled();
  });

  it('saves through the supplied handler when the person chooses Save changes', async () => {
    const save = vi.fn(async () => true);
    render(<Harness save={save} />);
    const trigger = screen.getByRole('button', { name: 'Edit preparation' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.change(screen.getByRole('textbox', { name: 'Internal notes' }), { target: { value: 'Updated note' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(save).toHaveBeenCalledOnce();
    expect(await screen.findByRole('button', { name: 'Edit preparation' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('does not offer a stale save after a revision conflict', () => {
    const save = vi.fn(async () => true);
    render(<Harness save={save} saveBlocked />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit preparation' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Internal notes' }), { target: { value: 'Stale draft' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText(/The saved case has changed/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
