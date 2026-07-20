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
});
