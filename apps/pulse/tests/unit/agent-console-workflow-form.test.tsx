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
      onManualStart={vi.fn()}
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
        onManualStart={vi.fn()}
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

  it('keeps the saved count out of the quick start header', () => {
    renderWorkflowForm({
      selectedExamplesCount: 2,
      showQuickStart: true,
    });

    expect(screen.queryByText('2 saved')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeInTheDocument();
  });

  it('keeps the post-result drawer compact', () => {
    renderWorkflowForm({
      draft: starterJobs[0].example,
      selectedExamplesCount: 2,
      variant: 'drawer',
    });

    expect(screen.getByRole('button', { name: 'Update draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run Jamie' })).not.toBeInTheDocument();
    expect(screen.queryByText(starterJobs[0].outputLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(starterJobs[0].description)).not.toBeInTheDocument();
    expect(screen.queryByText('2 saved')).not.toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: 'Create draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use example' })).not.toBeInTheDocument();
  });

  it('keeps workflow selection behind a secondary disclosure while quick start is visible', () => {
    const onSelectJob = vi.fn();

    renderWorkflowForm({ onSelectJob, showQuickStart: true });

    const workflowSelect = screen.getByLabelText('Workflow');
    expect(screen.getByText('Change workflow')).toBeInTheDocument();
    expect(workflowSelect).not.toBeVisible();

    fireEvent.click(screen.getByText('Change workflow').closest('summary')!);
    fireEvent.change(workflowSelect, { target: { value: 'listing-copy' } });

    expect(workflowSelect).toBeVisible();
    expect(onSelectJob).toHaveBeenCalledWith('listing-copy');
  });

  it('keeps workflow selection visible after quick start is gone', () => {
    renderWorkflowForm({ draft: 'Lead is ready for a follow up.', showQuickStart: false });

    expect(screen.getByLabelText('Workflow')).toBeVisible();
    expect(screen.queryByText('Change workflow')).not.toBeInTheDocument();
  });

  it('hides the output eyebrow while quick start is visible', () => {
    renderWorkflowForm({ showQuickStart: true });

    expect(screen.queryByText(starterJobs[0].outputLabel)).not.toBeInTheDocument();
  });

  it('restores the output eyebrow after quick start is gone', () => {
    renderWorkflowForm({ draft: 'Lead is ready for a follow up.', showQuickStart: false });

    expect(screen.getByText(starterJobs[0].outputLabel)).toBeInTheDocument();
  });

  it('hides the manual run button while quick start is visible', () => {
    renderWorkflowForm({ showQuickStart: true });

    expect(screen.queryByRole('button', { name: 'Run Jamie' })).not.toBeInTheDocument();
  });

  it('keeps manual input behind a secondary action while quick start is visible', () => {
    const onManualStart = vi.fn();

    renderWorkflowForm({ onManualStart, showQuickStart: true });

    expect(screen.getByRole('button', { name: 'Write my own' })).toBeInTheDocument();
    expect(screen.queryByLabelText(starterJobs[0].inputLabel)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Write my own' }));

    expect(onManualStart).toHaveBeenCalledTimes(1);
  });

  it('hides the voice action while quick start is visible', () => {
    renderWorkflowForm({ showQuickStart: true });

    expect(screen.queryByRole('button', { name: 'Voice: Warm, direct, local' })).not.toBeInTheDocument();
  });

  it('restores the secondary example button after quick start is gone', () => {
    const onExampleLoad = vi.fn();

    renderWorkflowForm({ draft: starterJobs[0].example, onExampleLoad, showQuickStart: false });

    fireEvent.click(screen.getByRole('button', { name: 'Use example' }));

    expect(onExampleLoad).toHaveBeenCalledTimes(1);
  });

  it('restores the manual run button after quick start is gone', () => {
    renderWorkflowForm({ draft: 'Lead is ready for a follow up.', showQuickStart: false });

    expect(screen.getByRole('button', { name: 'Run Jamie' })).toBeInTheDocument();
  });

  it('restores the voice action after quick start is gone', () => {
    const onPreferencesOpen = vi.fn();

    renderWorkflowForm({
      draft: 'Lead is ready for a follow up.',
      onPreferencesOpen,
      showQuickStart: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Voice: Warm, direct, local' }));

    expect(onPreferencesOpen).toHaveBeenCalledTimes(1);
  });
});
