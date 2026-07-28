import { describe, expect, it } from 'vitest';
import { END, START, StateGraph } from '@/lib/compat/langgraphLinear';

describe('langgraph compatibility graph', () => {
  it('supports conditional edges and lightweight checkpoints', async () => {
    const checkpoints: unknown[] = [];
    const graph = new StateGraph<{ command: string; route?: string; result?: string }>({})
      .addNode('classify', (state) => ({
        route: state.command.includes('listing') ? 'listing' : 'general',
      }))
      .addNode('listing', () => ({ result: 'listing workflow' }))
      .addNode('general', () => ({ result: 'general workflow' }))
      .addEdge(START, 'classify')
      .addConditionalEdges('classify', (state) => state.route || 'general', {
        listing: 'listing',
        general: 'general',
      })
      .addEdge('listing', END)
      .addEdge('general', END)
      .compile({
        checkpointer: (checkpoint) => {
          checkpoints.push(checkpoint);
        },
      });

    const result = await graph.invoke({ command: 'audit this listing' });

    expect(result.result).toBe('listing workflow');
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0]).toEqual(expect.objectContaining({
      node: 'classify',
      step: 1,
    }));
  });
});
