import { GraphSnapshot, IdeaEdge, IdeaObject } from '@ideate/api-client';
import { deriveStudentHome } from './student-home';

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

function edge(from: string, to: string, type = 'derived-from'): IdeaEdge {
  return {
    id: from + to,
    workspaceId: 'ws',
    branchId: 'br',
    displayId: 'R',
    type,
    fromObjectId: from,
    toObjectId: to,
    createdAt: '',
  };
}

describe('deriveStudentHome', () => {
  it('picks the last focused concept, else the most recently updated', () => {
    const older = node({ id: 'c1', type: 'concept', displayId: 'C-001', updatedAt: '2026-01-01T00:00:00Z' });
    const newer = node({ id: 'c2', type: 'concept', displayId: 'C-002', updatedAt: '2026-02-01T00:00:00Z' });
    const graph: GraphSnapshot = { nodes: [older, newer], edges: [] };
    expect(deriveStudentHome(graph).currentConcept?.id).toBe('c2');
    expect(deriveStudentHome(graph, 'c1').currentConcept?.id).toBe('c1');
  });

  it('treats unknowns with an example neighbor as resolved', () => {
    const concept = node({ id: 'c', type: 'concept', displayId: 'C-001' });
    const open = node({
      id: 'u1',
      type: 'unknown',
      objectCategory: 'unknown',
      displayId: 'U-001',
      derivedFrom: ['c'],
    });
    const closed = node({
      id: 'u2',
      type: 'unknown',
      objectCategory: 'unknown',
      displayId: 'U-002',
    });
    const example = node({
      id: 'e',
      type: 'evidence',
      displayId: 'E-001',
      tags: ['example'],
      objectCategory: 'speculative',
    });
    const graph: GraphSnapshot = {
      nodes: [concept, open, closed, example],
      edges: [edge('e', 'u2')],
    };
    const home = deriveStudentHome(graph);
    expect(home.openUnknowns.map((n) => n.id)).toEqual(['u1']);
    expect(home.practiceGaps.some((g) => g.kind === 'open-unknown' && g.object.id === 'u1')).toBe(true);
    expect(home.practiceGaps.some((g) => g.object.id === 'u2')).toBe(false);
  });

  it('keeps abandoned misconceptions out of in-play', () => {
    const live = node({ id: 'm1', type: 'misconception', objectCategory: 'misconception', displayId: 'M-001' });
    const dropped = node({ id: 'm2', type: 'misconception', objectCategory: 'abandoned', displayId: 'M-002' });
    const home = deriveStudentHome({ nodes: [live, dropped], edges: [] });
    expect(home.misconceptionsInPlay.map((n) => n.id)).toEqual(['m1']);
  });

  it('lists concepts without examples and hypotheses without critique or evaluation', () => {
    const concept = node({ id: 'c', type: 'concept', displayId: 'C-001' });
    const hyp = node({ id: 'h', type: 'hypothesis', displayId: 'H-001' });
    const home = deriveStudentHome({ nodes: [concept, hyp], edges: [] });
    expect(home.practiceGaps.some((g) => g.kind === 'no-example' && g.object.id === 'c')).toBe(true);
    expect(home.practiceGaps.some((g) => g.kind === 'unchallenged' && g.object.id === 'h')).toBe(true);
  });
});
