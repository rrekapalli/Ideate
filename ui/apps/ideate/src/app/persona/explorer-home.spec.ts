import { GraphSnapshot, IdeaEdge, IdeaObject } from '@ideate/api-client';
import { deriveExplorerHome } from './explorer-home';

function node(partial: Partial<IdeaObject> & Pick<IdeaObject, 'id' | 'type'>): IdeaObject {
  return {
    workspaceId: 'ws',
    branchId: 'br',
    displayId: partial.displayId ?? partial.id.toUpperCase(),
    origin: 'original',
    objectCategory: 'active',
    title: partial.title ?? partial.id,
    summary: '',
    body: '',
    version: 1,
    tags: [],
    derivedFrom: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

function edge(partial: Partial<IdeaEdge> & Pick<IdeaEdge, 'fromObjectId' | 'toObjectId' | 'type'>): IdeaEdge {
  return {
    id: partial.id ?? partial.fromObjectId + partial.toObjectId,
    workspaceId: 'ws',
    branchId: 'br',
    displayId: 'R',
    createdAt: '',
    ...partial,
  };
}

describe('deriveExplorerHome', () => {
  it('picks the last focused thought, else the newest living thought', () => {
    const older = node({
      id: 't1',
      type: 'thought',
      displayId: 'T-001',
      objectCategory: 'speculative',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    const newer = node({
      id: 't2',
      type: 'thought',
      displayId: 'T-002',
      objectCategory: 'speculative',
      updatedAt: '2026-02-01T00:00:00Z',
    });
    const dropped = node({
      id: 't3',
      type: 'thought',
      displayId: 'T-003',
      objectCategory: 'abandoned',
      updatedAt: '2026-03-01T00:00:00Z',
    });
    const graph: GraphSnapshot = { nodes: [older, newer, dropped], edges: [] };
    expect(deriveExplorerHome(graph).growingThought?.id).toBe('t2');
    expect(deriveExplorerHome(graph, 't1').growingThought?.id).toBe('t1');
  });

  it('lists unknowns as inventory, not a failure count, and dropped cards with why', () => {
    const unknown = node({ id: 'u1', type: 'unknown', objectCategory: 'unknown', displayId: 'U-001', title: 'Lifetime' });
    const closed = node({ id: 'u2', type: 'unknown', objectCategory: 'active', displayId: 'U-002' });
    const dead = node({ id: 'c1', type: 'concept', objectCategory: 'abandoned', displayId: 'C-001', title: 'Monolith' });
    const graph: GraphSnapshot = {
      nodes: [unknown, closed, dead],
      edges: [edge({ type: 'abandoned-because', fromObjectId: 'c1', toObjectId: 'c1', why: 'Could not stay dormant' })],
    };
    const home = deriveExplorerHome(graph);
    expect(home.unknowns.map((n) => n.id)).toEqual(['u1']);
    expect(home.dropped).toEqual([{ object: dead, why: 'Could not stay dormant' }]);
  });
});
