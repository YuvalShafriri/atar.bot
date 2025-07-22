// graphQueryService.tsx
// A tool-call service exposing a single query_graph function for heritage graph queries.
// React independent; kept as .tsx for TypeScript compatibility with React projects.

export type Node = {
  id: string;
  name?: string;
  label?: string;
  type: string;
  heritageValue?: string;
};

export type Edge = { from: string; to: string; label?: string };

export type AssetNode = Node & { isHeritageAsset?: boolean };

export interface GraphData {
  nodes: AssetNode[];
  edges: Edge[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  name?: string;
  tool_calls?: any[];
}

export const QUERY_GRAPH_TOOL = {
  name: 'query_graph',
  description: 'Structured graph queries for heritage assets.',
  parameters: {
    type: 'object',
    properties: {
      query_type: {
        type: 'string',
        enum: [
          'assets_by_value',
          'connected_assets',
          'shared_values_between_assets',
          'list_values_of_asset'
        ]
      },
      value: { type: 'string' },
      asset_name: { type: 'string' },
      asset_name_b: { type: 'string' },
      max_hop: { type: 'integer', default: 1 }
    },
    required: ['query_type']
  }
};

interface Preprocessed {
  nodesByName: Map<string, AssetNode>;
  nodesById: Map<string, AssetNode>;
  edgesFrom: Map<string, Set<string>>;
  valueToAssets: Map<string, Set<string>>;
}

function preprocess(graph: GraphData): Preprocessed {
  const nodesByName = new Map<string, AssetNode>();
  const nodesById = new Map<string, AssetNode>();
  const edgesFrom = new Map<string, Set<string>>();
  const valueToAssets = new Map<string, Set<string>>();

  graph.nodes.forEach(n => {
    const key = n.name || n.label || n.id;
    nodesByName.set(key, n);
    nodesById.set(n.id, n);
    if (n.isHeritageAsset && n.heritageValue) {
      const val = n.heritageValue.trim();
      if (!valueToAssets.has(val)) valueToAssets.set(val, new Set());
      valueToAssets.get(val)!.add(n.id);
    }
  });

  graph.edges.forEach(e => {
    const set = edgesFrom.get(e.from) || new Set<string>();
    if (nodesById.get(e.to)?.isHeritageAsset) set.add(e.to);
    edgesFrom.set(e.from, set);
  });

  return { nodesByName, nodesById, edgesFrom, valueToAssets };
}

export function queryGraph(params: any, graph: GraphData) {
  const pp = preprocess(graph);
  const qt = params.query_type as string;

  switch (qt) {
    case 'assets_by_value': {
      const value = params.value?.trim();
      if (!value) return [];
      const ids = pp.valueToAssets.get(value) || new Set();
      return Array.from(ids).map(id => pp.nodesById.get(id));
    }
    case 'connected_assets': {
      const name = params.asset_name?.trim();
      if (!name) return [];
      const start = pp.nodesByName.get(name);
      if (!start) return [];
      const hop = typeof params.max_hop === 'number' ? params.max_hop : 1;

      const res = new Set<string>();
      let frontier = [start.id];
      let current = 0;
      while (frontier.length && current < hop) {
        const next: string[] = [];
        frontier.forEach(id => {
          (pp.edgesFrom.get(id) || new Set()).forEach(nbr => {
            res.add(nbr);
            next.push(nbr);
          });
        });
        frontier = next;
        current++;
      }
      res.delete(start.id);
      return Array.from(res).map(id => pp.nodesById.get(id));
    }
    case 'shared_values_between_assets': {
      const a = params.asset_name?.trim();
      const b = params.asset_name_b?.trim();
      if (!a || !b) return [];
      const nodeA = pp.nodesByName.get(a);
      const nodeB = pp.nodesByName.get(b);
      if (!nodeA || !nodeB) return [];
      const valsA = new Set<string>(nodeA.heritageValue?.split(/[,;]/).map(s => s.trim()) ?? []);
      const valsB = new Set<string>(nodeB.heritageValue?.split(/[,;]/).map(s => s.trim()) ?? []);
      return Array.from(valsA).filter(v => valsB.has(v));
    }
    case 'list_values_of_asset': {
      const name = params.asset_name?.trim();
      const node = pp.nodesByName.get(name);
      if (!node || !node.heritageValue) return [];
      return node.heritageValue.split(/[,;]/).map(v => v.trim());
    }
    default:
      return [];
  }
}

export async function chatGraph(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<string> {
  const router = await fetchChatCompletion(
    [
      { role: 'system', content: 'השתמש ב‑query_graph כאשר אפשר.' },
      { role: 'user', content: question }
    ],
    [QUERY_GRAPH_TOOL]
  );

  const call = router.tool_calls?.[0] || router.choices?.[0]?.message?.tool_calls?.[0];
  if (call?.name === 'query_graph') {
    const params = JSON.parse(call.arguments || call.args);
    const result = queryGraph(params, graph);

    const answer = await fetchChatCompletion([
      router.message ?? router.choices?.[0]?.message,
      { role: 'tool', name: 'query_graph', content: JSON.stringify(result) }
    ]);
    return (answer.message?.content || answer.choices?.[0]?.message?.content || '').trim();
  }
  return (router.message?.content || router.choices?.[0]?.message?.content || '').trim();
}
