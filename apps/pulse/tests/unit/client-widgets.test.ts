import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClientWidgets from '@/components/ClientWidgets';

const mockState = vi.hoisted(() => ({
  dynamicIndex: 0,
  dynamicNames: [
    'jamie-chat',
    'feedback-widget',
    'dev-portal',
    'jamie-insights-login-toast',
    'jamie-pulse-overlay'
  ],
  pathname: '/'
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const name = mockState.dynamicNames[mockState.dynamicIndex++] ?? 'dynamic-widget';
    return function MockDynamicWidget() {
      return name;
    };
  }
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockState.pathname
}));

describe('ClientWidgets operator surfaces', () => {
  beforeEach(() => {
    mockState.pathname = '/';
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the global Jamie dock off the public command center', async () => {
    mockState.pathname = '/command-center';

    const { container } = render(React.createElement(ClientWidgets));

    await waitFor(() => expect(container).toHaveTextContent('feedback-widget'));
    expect(container).toHaveTextContent('dev-portal');
    expect(container).not.toHaveTextContent('jamie-chat');
    expect(container).not.toHaveTextContent('jamie-pulse-overlay');
  });

  it('keeps the global Jamie dock off the admin orchestrator console', async () => {
    mockState.pathname = '/admin/orchestrator';

    const { container } = render(React.createElement(ClientWidgets));

    await waitFor(() => expect(container).toHaveTextContent('feedback-widget'));
    expect(container).toHaveTextContent('dev-portal');
    expect(container).not.toHaveTextContent('jamie-chat');
    expect(container).not.toHaveTextContent('jamie-insights-login-toast');
    expect(container).not.toHaveTextContent('jamie-pulse-overlay');
  });

  it.each(['/value-guess', '/location-guess', '/play-jamie/chess', '/retail-clash'])(
    'keeps floating widgets off the focused game route %s',
    (pathname) => {
      mockState.pathname = pathname;

      const { container } = render(React.createElement(ClientWidgets));

      expect(container).toBeEmptyDOMElement();
      expect(container).not.toHaveTextContent('feedback-widget');
      expect(container).not.toHaveTextContent('dev-portal');
      expect(container).not.toHaveTextContent('jamie-chat');
      expect(container).not.toHaveTextContent('jamie-insights-login-toast');
      expect(container).not.toHaveTextContent('jamie-pulse-overlay');
    }
  );

  it('keeps Jamie widgets available on ordinary pages', async () => {
    mockState.pathname = '/idx';

    const { container } = render(React.createElement(ClientWidgets));

    await waitFor(() => expect(container).toHaveTextContent('jamie-chat'));
    expect(container).toHaveTextContent('feedback-widget');
    expect(container).toHaveTextContent('dev-portal');
    expect(container).toHaveTextContent('jamie-insights-login-toast');
    expect(container).toHaveTextContent('jamie-pulse-overlay');
  });
});
