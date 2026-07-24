type GraphNode<TState extends Record<string, unknown>> = (state: TState) => Promise<Partial<TState>> | Partial<TState>;
type GraphRouter<TState extends Record<string, unknown>> = (state: TState) => Promise<string> | string;
type GraphCheckpoint<TState extends Record<string, unknown>> = {
  node: string;
  step: number;
  state: TState;
  createdAt: string;
};
type GraphCheckpointer<TState extends Record<string, unknown>> =
  | ((checkpoint: GraphCheckpoint<TState>) => Promise<void> | void)
  | { put: (checkpoint: GraphCheckpoint<TState>) => Promise<void> | void };

type CompileOptions<TState extends Record<string, unknown>> = {
  checkpointer?: GraphCheckpointer<TState>;
  maxSteps?: number;
};

type InvokeOptions<TState extends Record<string, unknown>> = {
  checkpointer?: GraphCheckpointer<TState>;
  maxSteps?: number;
};

export const START = '__start__';
export const END = '__end__';

export function Annotation<TValue>() {
  return {} as { Value: TValue };
}

Annotation.Root = function Root<TSchema extends Record<string, unknown>>(schema: TSchema) {
  return {
    schema,
    State: undefined as unknown as {
      [K in keyof TSchema]: TSchema[K] extends { Value: infer TValue } ? TValue : never;
    }
  };
};

export class StateGraph<TState extends Record<string, unknown>> {
  private nodes = new Map<string, GraphNode<TState>>();
  private edges = new Map<string, string>();
  private conditionalEdges = new Map<string, {
    router: GraphRouter<TState>;
    branches?: Record<string, string>;
  }>();

  constructor(_annotation: unknown) {}

  addNode(name: string, node: GraphNode<TState>) {
    this.nodes.set(name, node);
    return this;
  }

  addEdge(from: string, to: string) {
    this.edges.set(from, to);
    return this;
  }

  addConditionalEdges(from: string, router: GraphRouter<TState>, branches?: Record<string, string>) {
    this.conditionalEdges.set(from, { router, branches });
    return this;
  }

  compile(options: CompileOptions<TState> = {}) {
    const nodes = new Map(this.nodes);
    const edges = new Map(this.edges);
    const conditionalEdges = new Map(this.conditionalEdges);

    return {
      async invoke(initialState: Partial<TState>, invokeOptions: InvokeOptions<TState> = {}) {
        let current = edges.get(START);
        let state = { ...initialState } as TState;
        const visited = new Set<string>();
        const checkpointer = invokeOptions.checkpointer || options.checkpointer;
        const maxSteps = invokeOptions.maxSteps || options.maxSteps || nodes.size + conditionalEdges.size + 2;
        let step = 0;

        while (current && current !== END) {
          if (visited.has(current)) {
            throw new Error(`Command graph cycle detected at node "${current}".`);
          }

          if (step >= maxSteps) {
            throw new Error(`Command graph exceeded ${maxSteps} steps.`);
          }

          visited.add(current);

          const node = nodes.get(current);
          if (!node) {
            throw new Error(`Command graph node "${current}" is not registered.`);
          }

          const update = await node(state);
          state = { ...state, ...update };
          step++;
          await writeCheckpoint(checkpointer, {
            node: current,
            step,
            state,
            createdAt: new Date().toISOString(),
          });
          current = await nextNode(current, state, edges, conditionalEdges);
        }

        return state;
      }
    };
  }
}

async function nextNode<TState extends Record<string, unknown>>(
  current: string,
  state: TState,
  edges: Map<string, string>,
  conditionalEdges: Map<string, { router: GraphRouter<TState>; branches?: Record<string, string> }>,
) {
  const conditional = conditionalEdges.get(current);
  if (!conditional) return edges.get(current);

  const route = await conditional.router(state);
  return conditional.branches?.[route] || route;
}

async function writeCheckpoint<TState extends Record<string, unknown>>(
  checkpointer: GraphCheckpointer<TState> | undefined,
  checkpoint: GraphCheckpoint<TState>,
) {
  if (!checkpointer) return;
  if (typeof checkpointer === 'function') {
    await checkpointer(checkpoint);
    return;
  }

  await checkpointer.put(checkpoint);
}
