import { GraphSnapshot, IdeaEdge, IdeaObject } from '@ideate/api-client';
import { hasTag } from './persona-lens';

export type PracticeGapKind = 'no-example' | 'unchallenged' | 'open-unknown';

export interface PracticeGap {
  kind: PracticeGapKind;
  object: IdeaObject;
  parent?: IdeaObject;
  label: string;
}

export interface StudentHomeModel {
  currentConcept: IdeaObject | null;
  openUnknowns: IdeaObject[];
  misconceptionsInPlay: IdeaObject[];
  practiceGaps: PracticeGap[];
}

export function deriveStudentHome(
  snapshot: GraphSnapshot,
  lastFocusedConceptId?: string | null,
): StudentHomeModel {
  const nodes = snapshot.nodes ?? [];
  const edges = snapshot.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighborIds = neighborIndex(nodes, edges);

  const concepts = nodes.filter((n) => n.type === 'concept');
  const currentConcept =
    (lastFocusedConceptId && concepts.find((n) => n.id === lastFocusedConceptId)) ||
    newestByUpdated(concepts);

  const openUnknowns = nodes.filter(
    (n) => n.type === 'unknown' && n.objectCategory === 'unknown' && !hasExampleNeighbor(n, byId, neighborIds),
  );

  const misconceptionsInPlay = nodes.filter(
    (n) => n.type === 'misconception' && n.objectCategory !== 'abandoned',
  );

  const practiceGaps: PracticeGap[] = [];
  for (const concept of concepts) {
    if (!hasExampleNeighbor(concept, byId, neighborIds)) {
      practiceGaps.push({
        kind: 'no-example',
        object: concept,
        label: `${concept.displayId} has no example`,
      });
    }
  }
  for (const hyp of nodes.filter((n) => n.type === 'hypothesis')) {
    if (!hasNeighborOfTypes(hyp, byId, neighborIds, ['critique', 'evaluation'])) {
      practiceGaps.push({
        kind: 'unchallenged',
        object: hyp,
        label: `${hyp.displayId} has never been challenged`,
      });
    }
  }
  for (const unknown of openUnknowns) {
    const parent = parentConcept(unknown, byId, edges);
    practiceGaps.push({
      kind: 'open-unknown',
      object: unknown,
      parent,
      label: parent
        ? `${unknown.displayId} blocks ${parent.displayId}`
        : `${unknown.displayId} is still open`,
    });
  }

  return { currentConcept, openUnknowns, misconceptionsInPlay, practiceGaps };
}

function newestByUpdated(nodes: IdeaObject[]): IdeaObject | null {
  if (!nodes.length) {
    return null;
  }
  return [...nodes].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0];
}

function neighborIndex(nodes: IdeaObject[], edges: IdeaEdge[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    const set = map.get(a) ?? new Set<string>();
    set.add(b);
    map.set(a, set);
  };
  for (const e of edges) {
    add(e.fromObjectId, e.toObjectId);
    add(e.toObjectId, e.fromObjectId);
  }
  for (const n of nodes) {
    for (const parent of n.derivedFrom ?? []) {
      add(n.id, parent);
      add(parent, n.id);
    }
  }
  return map;
}

function hasExampleNeighbor(
  node: IdeaObject,
  byId: Map<string, IdeaObject>,
  neighbors: Map<string, Set<string>>,
): boolean {
  for (const id of neighbors.get(node.id) ?? []) {
    const other = byId.get(id);
    if (other?.type === 'evidence' && hasTag(other.tags, 'example')) {
      return true;
    }
  }
  return false;
}

function hasNeighborOfTypes(
  node: IdeaObject,
  byId: Map<string, IdeaObject>,
  neighbors: Map<string, Set<string>>,
  types: string[],
): boolean {
  const want = new Set(types);
  for (const id of neighbors.get(node.id) ?? []) {
    const other = byId.get(id);
    if (other && want.has(other.type)) {
      return true;
    }
  }
  return false;
}

function parentConcept(
  node: IdeaObject,
  byId: Map<string, IdeaObject>,
  edges: IdeaEdge[],
): IdeaObject | undefined {
  for (const parentId of node.derivedFrom ?? []) {
    const parent = byId.get(parentId);
    if (parent?.type === 'concept') {
      return parent;
    }
  }
  for (const e of edges) {
    if (e.toObjectId === node.id) {
      const from = byId.get(e.fromObjectId);
      if (from?.type === 'concept') {
        return from;
      }
    }
    if (e.fromObjectId === node.id) {
      const to = byId.get(e.toObjectId);
      if (to?.type === 'concept') {
        return to;
      }
    }
  }
  return undefined;
}
