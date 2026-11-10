import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import manifest from '@/lib/platform/apps/manifests/real-estate-readiness.v1.json';
import { appManifestSchema } from '@/lib/platform/contracts/appManifest';
import { ManifestForm } from '@/components/platform/ManifestForm';
import { CheckpointCard, CheckpointResponseError } from '@/components/platform/CheckpointCard';

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

  it('requires an explicit approval or rejection decision', async () => {
    const onRespond = vi.fn().mockResolvedValue(undefined);
    render(<CheckpointCard checkpoint={{ id: 'approval-1', node_id: 'review', type: 'approval', prompt: 'Review this exact draft.', target: { resourceType: 'seller_video_brief', resourceId: 'brief-1', revision: 2, action: 'review_seller_video_brief' }, revision: 1 }} onRespond={onRespond} />);
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Approve' })); });
    expect(onRespond).toHaveBeenCalledWith(expect.objectContaining({ checkpointId: 'approval-1', expectedRevision: 1, value: true, submissionKey: expect.any(String) }));
  });

  it('locks decisions when an approval target cannot be previewed and checked', async () => {
    const onRespond = vi.fn();
    render(<CheckpointCard checkpoint={{ id: 'approval-2', node_id: 'review', type: 'approval', prompt: 'Review this listing.', target: { resourceType: 'listing', resourceId: 'listing-1', revision: 2, action: 'publish' }, revision: 1 }} onRespond={onRespond} decisionUnavailableReason="This target has no exact preview and revision check in the inbox yet, so no approval can be recorded." />);
    expect(screen.getByText(/no approval can be recorded/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(onRespond).not.toHaveBeenCalled();
  });

  it('locks a stale checkpoint and offers a direct data reload', async () => {
    const onRespond = vi.fn().mockRejectedValue(new CheckpointResponseError('This checkpoint changed while you were reviewing it.', true));
    const onReload = vi.fn();
    render(<CheckpointCard checkpoint={{ id: 'approval-3', node_id: 'review', type: 'approval', prompt: 'Review this draft.', target: { resourceType: 'seller_video_brief', resourceId: 'brief-2', revision: 3, action: 'review_seller_video_brief' }, revision: 1 }} onRespond={onRespond} onReload={onReload} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Approve' })); });
    expect(screen.getByRole('status')).toHaveTextContent('This checkpoint changed while you were reviewing it.');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reload workspace data' }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('keeps reviewers read-only when their workspace role cannot resolve a question', () => {
    const onRespond = vi.fn();
    render(<CheckpointCard checkpoint={{ id: 'question-1', node_id: 'answer', type: 'question', prompt: 'What should we verify?', response_schema: { type: 'string' }, revision: 1 }} onRespond={onRespond} canRespond={false} />);
    expect(screen.getByText('Your workspace role can view this checkpoint but cannot decide it.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save response' })).toBeDisabled();
  });
});
