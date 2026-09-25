import { GraphSnapshot, IdeaEdge, IdeaObject } from '@ideate/api-client';

export interface InventorHomeModel {
  bindingConstraint: IdeaObject | null;
  openDecision: IdeaObject | null;
  problemSolved: IdeaObject | null;
  problemCreated: IdeaObject | null;
  openTargets: IdeaObject[];
  staleCalculations: IdeaObject[];
}

export function deriveInventorHome(snapshot: GraphSnapshot): InventorHomeModel {
  const nodes = snapshot.nodes ?? [];
  const edges = snapshot.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const constraints = nodes.filter((n) => n.type === 'constraint' && n.objectCategory !== 'abandoned');
  const binding =
    newestByUpdated(constraints.filter((n) => detailText(n, 'posture') === 'binding')) ||
    newestByUpdated(constraints);

  const decisions = nodes.filter((n) => n.type === 'decision' && n.objectCategory !== 'abandoned');
  const architectures = nodes.filter((n) => n.type === 'architecture' && n.objectCategory !== 'abandoned');
  const openDecision = newestByUpdated(decisions) || newestByUpdated(architectures);

  const problemSolved = newestByUpdated(linkedOfTypes(edges, byId, 'solves', ['question', 'hypothesis']));
  const problemCreated = newestByUpdated(
    linkedOfTypes(edges, byId, 'introduces', ['question', 'constraint', 'critique', 'hypothesis']),
  );

  const openTargets = nodes
    .filter((n) => n.type === 'target' && n.objectCategory === 'speculative')
    .sort(byUpdatedDesc);

  const staleCalculations = nodes
    .filter((n) => n.type === 'calculation' && detailTrue(n, 'stale'))
    .sort(byUpdatedDesc);

  return {
    bindingConstraint: binding,
    openDecision,
    problemSolved,
    problemCreated,
    openTargets,
    staleCalculations,
  };
}

function linkedOfTypes(
  edges: IdeaEdge[],
  byId: Map<string, IdeaObject>,
  type: string,
  types: string[],
): IdeaObject[] {
  const found: IdeaObject[] = [];
  for (const e of edges) {
    if (e.type !== type) {
      continue;
    }
    const from = byId.get(e.fromObjectId);
    const to = byId.get(e.toObjectId);
    for (const node of [from, to]) {
      if (node && types.includes(node.type) && !found.some((n) => n.id === node.id)) {
        found.push(node);
      }
    }
  }
  return found;
}

function newestByUpdated(nodes: IdeaObject[]): IdeaObject | null {
  if (!nodes.length) {
    return null;
  }
  return [...nodes].sort(byUpdatedDesc)[0];
}

function byUpdatedDesc(a: IdeaObject, b: IdeaObject): number {
  return (b.updatedAt || '').localeCompare(a.updatedAt || '');
}

function detailText(object: IdeaObject, key: string): string | null {
  const value = object.details?.[key];
  return value == null ? null : String(value);
}

function detailTrue(object: IdeaObject, key: string): boolean {
  return object.details?.[key] === true || object.details?.[key] === 'true';
}
