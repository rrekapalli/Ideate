import { GraphSnapshot, IdeaEdge, IdeaObject } from '@ideate/api-client';
import { assumptionBreaks, deriveDecisionReplay, deriveProductHome } from './product-home';

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
    id: partial.id ?? partial.fromObjectId + partial.toObjectId + partial.type,
    workspaceId: 'ws',
    branchId: 'br',
    displayId: 'R',
    createdAt: '',
    ...partial,
  };
}

describe('deriveProductHome', () => {
  it('pins the named question and lists live vs killed bets', () => {
    const pin = node({ id: 'q1', type: 'question', displayId: 'Q-001', title: 'Who is this for?' });
    const live = node({ id: 'h1', type: 'hypothesis', displayId: 'H-001', title: 'They will pay' });
    const killed = node({
      id: 'h2',
      type: 'hypothesis',
      displayId: 'H-002',
      objectCategory: 'abandoned',
      title: 'A marketplace',
    });
    const assumption = node({ id: 'a1', type: 'assumption', displayId: 'A-001' });
    const decision = node({
      id: 'd1',
      type: 'decision',
      displayId: 'D-001',
      details: { disposition: 'build' },
    });
    const graph: GraphSnapshot = {
      nodes: [pin, live, killed, assumption, decision],
      edges: [edge({ fromObjectId: 'h2', toObjectId: 'h2', type: 'abandoned-because', why: 'No willingness to pay' })],
    };
    const home = deriveProductHome(graph, 'q1');
    expect(home.pinnedProblem?.id).toBe('q1');
    expect(home.liveBets.map((n) => n.id)).toEqual(['h1']);
    expect(home.killedBets[0].object.id).toBe('h2');
    expect(home.killedBets[0].why).toBe('No willingness to pay');
    expect(home.openAssumptions.map((n) => n.id)).toEqual(['a1']);
    expect(home.decisions.map((n) => n.id)).toEqual(['d1']);
  });

  it('walks assumption dependents and decision replay evidence', () => {
    const assumption = node({ id: 'a1', type: 'assumption', displayId: 'A-001' });
    const bet = node({ id: 'h1', type: 'hypothesis', displayId: 'H-001' });
    const interview = node({
      id: 'e1',
      type: 'evidence',
      displayId: 'E-001',
      tags: ['heard'],
      title: 'They already have a workaround',
    });
    const decision = node({
      id: 'd1',
      type: 'decision',
      displayId: 'D-001',
      details: { disposition: 'kill', choice: 'Do not build X', reason: 'Interview weakened it' },
    });
    const constraint = node({ id: 'k1', type: 'constraint', displayId: 'K-001', title: 'Must stay HIPAA' });
    const graph: GraphSnapshot = {
      nodes: [assumption, bet, interview, decision, constraint],
      edges: [
        edge({ fromObjectId: 'h1', toObjectId: 'a1', type: 'assumes' }),
        edge({ fromObjectId: 'd1', toObjectId: 'h1', type: 'led-to' }),
        edge({ fromObjectId: 'e1', toObjectId: 'h1', type: 'contradicts' }),
      ],
    };
    const breaks = assumptionBreaks(graph, 'a1');
    expect(breaks.some((row) => row.object.id === 'h1')).toBe(true);
    expect(breaks.some((row) => row.object.id === 'd1')).toBe(true);
    const replay = deriveDecisionReplay(graph, decision);
    expect(replay.disposition).toBe('kill');
    expect(replay.bets.map((n) => n.id)).toContain('h1');
    expect(replay.weakeningEvidence.map((n) => n.id)).toContain('e1');
    expect(replay.assumptions.map((n) => n.id)).toContain('a1');
    expect(replay.constraints.map((n) => n.id)).toContain('k1');
  });
});
