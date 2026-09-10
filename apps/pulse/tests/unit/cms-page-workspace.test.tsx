import React, { useEffect, useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CmsPageWorkspace } from '@/app/vibes/pages/CmsPageWorkspace';

describe('CMS split workspace', () => {
  it('mounts preview only on request and retains both panes across layout changes', () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    function PreviewFixture() {
      const [theme, setTheme] = useState('core');
      useEffect(() => { mounted(); return unmounted; }, []);
      return <select aria-label="Theme fixture" value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="core">Core</option><option value="editorial">Editorial</option>
      </select>;
    }
    const view = render(<CmsPageWorkspace preview={<PreviewFixture />}><input aria-label="Draft fixture" defaultValue="Saved" /></CmsPageWorkspace>);
    const input = screen.getByLabelText('Draft fixture');
    fireEvent.change(input, { target: { value: 'Unsaved' } });
    expect(mounted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open live preview' }));
    fireEvent.change(screen.getByLabelText('Theme fixture'), { target: { value: 'editorial' } });
    fireEvent.click(screen.getByRole('button', { name: 'Full preview' }));
    expect(view.container.firstChild).toHaveAttribute('data-mode', 'preview');
    fireEvent.click(screen.getByRole('button', { name: 'Edit only' }));
    fireEvent.click(screen.getByRole('button', { name: 'Split view' }));
    expect(screen.getByLabelText('Draft fixture')).toBe(input);
    expect(input).toHaveValue('Unsaved');
    expect(screen.getByLabelText('Theme fixture')).toHaveValue('editorial');
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
  });

  it('supports mobile tab keyboard navigation and exposes the selected pane', () => {
    const view = render(<CmsPageWorkspace preview={<p>Preview fixture</p>}><input aria-label="Draft fixture" /></CmsPageWorkspace>);
    const tabs = within(screen.getByRole('tablist', { name: 'Workspace view' }));
    const edit = tabs.getByRole('tab', { name: 'Edit' });
    const preview = tabs.getByRole('tab', { name: 'Live preview' });
    edit.focus();
    fireEvent.keyDown(edit, { key: 'ArrowRight' });
    expect(preview).toHaveFocus();
    expect(preview).toHaveAttribute('aria-selected', 'true');
    expect(view.container.firstChild).toHaveAttribute('data-mobile-panel', 'preview');
    expect(document.getElementById(preview.getAttribute('aria-controls')!)).toContainElement(screen.getByText('Preview fixture'));
    fireEvent.keyDown(preview, { key: 'Home' });
    expect(edit).toHaveFocus();
    expect(view.container.firstChild).toHaveAttribute('data-mobile-panel', 'edit');
    expect(preview).toHaveAttribute('tabindex', '-1');
  });
});
