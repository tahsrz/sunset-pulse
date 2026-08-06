import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import JamieChatMinimized from '@/components/chat/JamieChatMinimized';

describe('Jamie minimized launcher', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps one accessible compact trigger and opens Jamie on demand', () => {
    const onOpen = vi.fn();
    render(<JamieChatMinimized onOpen={onOpen} isLefthandMode={false} />);

    const button = screen.getByRole('button', { name: 'Open Jamie' });
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('sm:h-40');

    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows the rolling transcript without changing the launcher name', () => {
    render(
      <JamieChatMinimized
        onOpen={vi.fn()}
        isLefthandMode={false}
        listeningStatus="listening"
        liveCaption="Fort Worth homes under five hundred thousand"
      />,
    );

    expect(screen.getByRole('button', { name: 'Open Jamie' })).toBeTruthy();
    expect(screen.getByLabelText('Jamie live transcript').textContent).toContain(
      'Fort Worth homes under five hundred thousand',
    );
  });
});
