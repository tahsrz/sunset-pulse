import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultPreferences,
  starterJobs,
} from '../../components/agent-console/agentConsoleConfig';
import { AgentConsoleWorkflowForm } from '../../components/agent-console/AgentConsoleWorkflowForm';

describe('AgentConsoleWorkflowForm', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('bundles tone and CTA into one voice style choice', () => {
    const onPreferenceChange = vi.fn();

    render(
      <AgentConsoleWorkflowForm
        draft=""
        onDraftChange={vi.fn()}
        onExampleLoad={vi.fn()}
        onPreferenceChange={onPreferenceChange}
        onPreferencesOpen={vi.fn()}
        onQuickStart={vi.fn()}
        onRun={vi.fn()}
        onSavePreferences={vi.fn()}
        onSelectJob={vi.fn()}
        preferences={defaultPreferences}
        preferencesOpen
        running={false}
        selectedExamplesCount={0}
        selectedJob={starterJobs[0]}
        showQuickStart={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Advisory call/i }));

    expect(onPreferenceChange).toHaveBeenCalledWith('tone', 'Calm and advisory');
    expect(onPreferenceChange).toHaveBeenCalledWith('cta', 'Offer a short call');
    expect(screen.queryByLabelText('CTA')).not.toBeInTheDocument();
  });
});
