import { GraphSnapshot, IdeaObject } from '@ideate/api-client';

/** Root → … → clicked card, following incoming edges and derivedFrom. */
export function ancestorPath(snapshot: GraphSnapshot, start: IdeaObject): IdeaObject[] {
  const byId = new Map(snapshot.nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, string[]>();
  for (const edge of snapshot.edges) {
    const list = incoming.get(edge.toObjectId) ?? [];
    if (!list.includes(edge.fromObjectId)) {
      list.push(edge.fromObjectId);
    }
    incoming.set(edge.toObjectId, list);
  }
  for (const node of snapshot.nodes) {
    for (const parent of node.derivedFrom ?? []) {
      const list = incoming.get(node.id) ?? [];
      if (!list.includes(parent)) {
        list.push(parent);
      }
      incoming.set(node.id, list);
    }
  }
  const seen = new Set<string>();
  const chain: IdeaObject[] = [];
  const walk = (id: string) => {
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    for (const parent of incoming.get(id) ?? []) {
      walk(parent);
    }
    const node = byId.get(id);
    if (node) {
      chain.push(node);
    }
  };
  walk(start.id);
  if (chain.length === 0 || chain[chain.length - 1]?.id !== start.id) {
    chain.push(start);
  }
  return chain;
}
