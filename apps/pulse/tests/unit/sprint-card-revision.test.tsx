import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SprintCard } from '@/app/admin/sprints/SprintCard';

describe('proposed sprint draft concurrency', () => {
  it('retains the revision opened for editing after a refresh and keeps a rejected draft', async () => {
    const onUpdate = vi.fn().mockResolvedValue(false);
    const props = {
      sprint: { id: 'sprint', name: 'Weekly', goal: 'Research', status: 'proposed', revision: 2 },
      items: [{ id: 'item', title: 'Original', priority: 3, status: 'proposed' }],
      assignments: [], onApprove: vi.fn(), onRemove: vi.fn(), onComplete: vi.fn(), onUpdate,
    };
    const { rerender } = render(<SprintCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByDisplayValue('Original'), { target: { value: 'My unfinished edit' } });
    rerender(<SprintCard {...props} sprint={{ ...props.sprint, revision: 3 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save proposed item' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('item', 'sprint', 2, expect.objectContaining({ title: 'My unfinished edit' })));
    expect(screen.getByDisplayValue('My unfinished edit')).toBeInTheDocument();
  });
});
