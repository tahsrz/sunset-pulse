import { describe, expect, it } from 'vitest';
import { getJamieDisplayContent, sanitizeJamieReply } from '@/lib/ai/jamieResponse';

describe('jamie response abstraction', () => {
  it('removes internal labels and identity preambles from visible replies', () => {
    const reply = sanitizeJamieReply(`
As Jamie, my mission is to explain this.
[ACTIVE_ANALYSIS_NODES]: MAKIEL, GADRAEL
[ANALYSIS_PROFILE]: Professional
The rental potential looks strong based on the available numbers.
JAMIE_ANALYSIS_REPORT: hidden worker state
    `);

    expect(reply).toBe('The rental potential looks strong based on the available numbers.');
  });

  it('extracts display content from structured chat responses', () => {
    const reply = getJamieDisplayContent({
      role: 'assistant',
      content: 'Scanning Frisco homes now.',
      tool_calls: [{ id: 'call_1' }],
    });

    expect(reply).toBe('Scanning Frisco homes now.');
  });

  it('does not render raw tool-call payloads when content is empty', () => {
    const reply = getJamieDisplayContent({
      role: 'assistant',
      content: '',
      tool_calls: [{ id: 'call_1', function: { name: 'search_properties' } }],
    });

    expect(reply).toBe("I'm checking that now.");
  });

  it('handles accidental JSON string payloads', () => {
    const reply = getJamieDisplayContent(
      JSON.stringify({
        role: 'assistant',
        content: 'I found a few matching options.',
        tool_calls: [{ id: 'call_1' }],
      })
    );

    expect(reply).toBe('I found a few matching options.');
  });
});
