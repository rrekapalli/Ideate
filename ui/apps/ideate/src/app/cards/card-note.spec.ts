import { IdeaObject } from '@ideate/api-client';
import { cardUserNote, includeCardNoteInAi } from './card-note';

function node(details?: Record<string, unknown>): IdeaObject {
  return {
    id: 'o1',
    workspaceId: 'ws',
    branchId: 'br',
    displayId: 'H-001',
    type: 'hypothesis',
    origin: 'original',
    objectCategory: 'active',
    title: 'Bet',
    summary: '',
    body: '',
    version: 1,
    tags: [],
    derivedFrom: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    details,
  };
}

describe('card note helpers', () => {
  it('reads a persisted note and the AI include flag', () => {
    const obj = node({ userNote: '  Check price  ', includeUserNoteInAi: true });
    expect(cardUserNote(obj)).toBe('Check price');
    expect(includeCardNoteInAi(obj)).toBeTrue();
  });

  it('treats missing notes as empty and opted out', () => {
    expect(cardUserNote(node())).toBe('');
    expect(includeCardNoteInAi(node())).toBeFalse();
  });
});
