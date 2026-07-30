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

  const renderWorkflowForm = (
    overrides: Partial<React.ComponentProps<typeof AgentConsoleWorkflowForm>> = {},
  ) => render(
    <AgentConsoleWorkflowForm
      draft=""
      onDraftChange={vi.fn()}
      onExampleLoad={vi.fn()}
      onPreferenceChange={vi.fn()}
      onPreferencesOpen={vi.fn()}
      onQuickStart={vi.fn()}
      onRun={vi.fn()}
      onSavePreferences={vi.fn()}
      onSelectJob={vi.fn()}
      preferences={defaultPreferences}
      preferencesOpen={false}
      running={false}
      selectedExamplesCount={0}
      selectedJob={starterJobs[0]}
      showQuickStart={false}
      {...overrides}
    />,
  );

  it('bundles tone and CTA into one voice style choice', () => {
    const onPreferenceChange = vi.fn();

    renderWorkflowForm({
      onPreferenceChange,
      preferencesOpen: true,
    });

    fireEvent.click(screen.getByRole('button', { name: /Advisory call/i }));

    expect(onPreferenceChange).toHaveBeenCalledWith('tone', 'Calm and advisory');
    expect(onPreferenceChange).toHaveBeenCalledWith('cta', 'Offer a short call');
    expect(screen.queryByLabelText('CTA')).not.toBeInTheDocument();
  });

  it('keeps the header badge hidden until saved examples exist', () => {
    const { rerender } = renderWorkflowForm();

    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    expect(screen.queryByText('2 saved')).not.toBeInTheDocument();

    rerender(
      <AgentConsoleWorkflowForm
        draft=""
        onDraftChange={vi.fn()}
        onExampleLoad={vi.fn()}
        onPreferenceChange={vi.fn()}
        onPreferencesOpen={vi.fn()}
        onQuickStart={vi.fn()}
        onRun={vi.fn()}
        onSavePreferences={vi.fn()}
        onSelectJob={vi.fn()}
        preferences={defaultPreferences}
        preferencesOpen={false}
        running={false}
        selectedExamplesCount={2}
        selectedJob={starterJobs[0]}
        showQuickStart={false}
      />,
    );

    expect(screen.getByText('2 saved')).toBeInTheDocument();
  });

  it('keeps voice settings collapsed into one compact action', () => {
    const onPreferencesOpen = vi.fn();

    renderWorkflowForm({ onPreferencesOpen });

    fireEvent.click(screen.getByRole('button', { name: 'Voice: Warm, direct, local' }));

    expect(onPreferencesOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Agent in North Texas - Warm, direct, local')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tune Voice' })).not.toBeInTheDocument();
  });

  it('hides the secondary example button while quick start is visible', () => {
    renderWorkflowForm({ showQuickStart: true });

    expect(screen.getByRole('button', { name: 'Start with example' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use example' })).not.toBeInTheDocument();
  });

  it('restores the secondary example button after quick start is gone', () => {
    const onExampleLoad = vi.fn();

    renderWorkflowForm({ onExampleLoad, showQuickStart: false });

    fireEvent.click(screen.getByRole('button', { name: 'Use example' }));

    expect(onExampleLoad).toHaveBeenCalledTimes(1);
  });
});
