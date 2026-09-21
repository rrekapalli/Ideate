import { ancestorPath } from './chat-context';
import { GraphSnapshot, IdeaObject } from '@ideate/api-client';

function node(id: string, displayId: string, derivedFrom: string[] = []): IdeaObject {
  return {
    id,
    workspaceId: 'ws',
    branchId: 'br',
    displayId,
    type: 'thought',
    origin: 'original',
    objectCategory: 'active',
    title: displayId,
    summary: '',
    body: '',
    version: 1,
    tags: [],
    derivedFrom,
    createdAt: '',
    updatedAt: '',
  };
}

describe('ancestorPath', () => {
  it('walks incoming edges from the clicked card back to the root', () => {
    const q = node('q', 'Q-001');
    const h = node('h', 'H-001');
    const follow = node('f', 'Q-003');
    const graph: GraphSnapshot = {
      nodes: [q, h, follow],
      edges: [
        { id: 'e1', workspaceId: 'ws', branchId: 'br', displayId: 'R-001', type: 'mentions', fromObjectId: 'q', toObjectId: 'h', createdAt: '' },
        { id: 'e2', workspaceId: 'ws', branchId: 'br', displayId: 'R-002', type: 'led-to', fromObjectId: 'h', toObjectId: 'f', createdAt: '' },
      ],
    };
    expect(ancestorPath(graph, follow).map((n) => n.displayId)).toEqual(['Q-001', 'H-001', 'Q-003']);
  });
});
