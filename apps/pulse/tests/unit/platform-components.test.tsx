import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import manifest from '@/lib/platform/apps/manifests/real-estate-readiness.v1.json';
import { appManifestSchema } from '@/lib/platform/contracts/appManifest';
import { ManifestForm } from '@/components/platform/ManifestForm';
import { CheckpointCard } from '@/components/platform/CheckpointCard';

describe('platform interaction primitives', () => {
  it('keeps manifest validation bounded and reports required fields', async () => {
    const schema = appManifestSchema.parse(manifest).inputSchema;
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    const view = render(<ManifestForm schema={schema} value={{}} onChange={onChange} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Required.');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'property-1' } });
    view.rerender(<ManifestForm schema={schema} value={{ property_id: 'property-1' }} onChange={onChange} onSubmit={onSubmit} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue' })); });
    expect(onChange).toHaveBeenCalledWith({ property_id: 'property-1' });
    expect(onSubmit).toHaveBeenCalledWith({ property_id: 'property-1' });
  });

  it('preserves the checkpoint revision and submission key on response', async () => {
    const onRespond = vi.fn().mockResolvedValue(undefined);
    render(<CheckpointCard checkpoint={{ id: 'checkpoint-1', node_id: 'missing_fact', type: 'question', prompt: 'What should Jamie organize?', response_schema: { type: 'string' }, revision: 4 }} onRespond={onRespond} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Confirm facts' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save response' })); });
    expect(onRespond).toHaveBeenCalledWith(expect.objectContaining({ checkpointId: 'checkpoint-1', expectedRevision: 4, value: 'Confirm facts', submissionKey: expect.any(String) }));
  });
});
