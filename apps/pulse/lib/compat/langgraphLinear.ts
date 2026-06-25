type GraphNode<TState extends Record<string, unknown>> = (state: TState) => Promise<Partial<TState>> | Partial<TState>;

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

  constructor(_annotation: unknown) {}

  addNode(name: string, node: GraphNode<TState>) {
    this.nodes.set(name, node);
    return this;
  }

  addEdge(from: string, to: string) {
    this.edges.set(from, to);
    return this;
  }

  compile() {
    const nodes = new Map(this.nodes);
    const edges = new Map(this.edges);

    return {
      async invoke(initialState: Partial<TState>) {
        let current = edges.get(START);
        let state = { ...initialState } as TState;
        const visited = new Set<string>();

        while (current && current !== END) {
          if (visited.has(current)) {
            throw new Error(`Command graph cycle detected at node "${current}".`);
          }
          visited.add(current);

          const node = nodes.get(current);
          if (!node) {
            throw new Error(`Command graph node "${current}" is not registered.`);
          }

          const update = await node(state);
          state = { ...state, ...update };
          current = edges.get(current);
        }

        return state;
      }
    };
  }
}
