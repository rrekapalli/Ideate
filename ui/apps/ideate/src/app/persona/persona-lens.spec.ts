import {
  composerPlaceholder,
  defaultChatMode,
  epistemicFooter,
  isExplorerPersona,
  isStudentPersona,
  orderedObjectTypes,
  overlayCreateLabel,
  typeDisplayLabel,
  typePluralDisplayLabel,
} from './persona-lens';

describe('persona-lens', () => {
  it('defaults Learn only for student workspaces', () => {
    expect(defaultChatMode('student')).toBe('learn');
    expect(defaultChatMode('researcher')).toBe('explore');
    expect(defaultChatMode('explorer')).toBe('explore');
    expect(isStudentPersona('Student')).toBe(true);
    expect(isExplorerPersona('Explorer')).toBe(true);
  });

  it('promotes Concept, Unknown, Misconception, Question first for students', () => {
    const types = orderedObjectTypes('student');
    expect(types.slice(0, 4)).toEqual(['concept', 'unknown', 'misconception', 'question']);
    expect(types).toContain('hypothesis');
    expect(orderedObjectTypes('inventor')[0]).toBe('thought');
  });

  it('promotes Thought, Concept, Unknown first for explorers and keeps the full catalog', () => {
    const types = orderedObjectTypes('explorer');
    expect(types.slice(0, 7)).toEqual([
      'thought',
      'concept',
      'unknown',
      'question',
      'assumption',
      'hypothesis',
      'critique',
    ]);
    expect(types).toContain('theory');
    expect(types).toContain('evidence');
  });

  it('aliases unknown and example-tagged evidence for students only', () => {
    expect(typeDisplayLabel('student', 'unknown')).toBe("I don't know yet");
    expect(typePluralDisplayLabel('student', 'unknown')).toBe("I don't know yet");
    expect(typeDisplayLabel('student', 'evidence', ['example'])).toBe('Example');
    expect(typeDisplayLabel('researcher', 'unknown')).toBe('Unknown');
    expect(typeDisplayLabel('student', 'evidence', ['paper'])).toBe('Evidence');
    expect(typeDisplayLabel('explorer', 'unknown')).toBe("I don't know yet");
    expect(typePluralDisplayLabel('explorer', 'unknown')).toBe("I don't know yet");
    expect(typeDisplayLabel('explorer', 'hypothesis')).toBe('Hypothesis');
  });

  it('uses rival-explanation copy on student overlays and wild-branch copy for explorer', () => {
    expect(overlayCreateLabel('student')).toBe('Rival explanation');
    expect(overlayCreateLabel('explorer')).toBe('Wild branch');
  });

  it('asks the explorer home question in the composer', () => {
    expect(composerPlaceholder('explorer')).toBe(
      'What thought is growing, and what should we not pretend to know?',
    );
    expect(composerPlaceholder('student')).toBe('Think out loud…');
  });

  it('picks epistemic footer chips from reserved tags and category', () => {
    expect(
      epistemicFooter({ id: 'a', objectCategory: 'speculative', tags: ['thought-experiment'] })?.label,
    ).toBe('Thought experiment');
    expect(epistemicFooter({ id: 'b', objectCategory: 'speculative', tags: [] })?.label).toBe('Speculation');
    expect(epistemicFooter({ id: 'c', objectCategory: 'supported', tags: [] })?.label).toBe('Evidence-backed');
    expect(epistemicFooter({ id: 'd', objectCategory: 'unknown', tags: [] })?.label).toBe('Unknown');
    expect(
      epistemicFooter(
        { id: 'e', objectCategory: 'abandoned', tags: ['speculation'] },
        [{ id: 'x', workspaceId: 'ws', branchId: 'br', displayId: 'R', type: 'abandoned-because', fromObjectId: 'e', toObjectId: 'e', why: 'Power dies', createdAt: '' }],
      ),
    ).toEqual({ kind: 'dropped', label: 'Dropped', why: 'Power dies' });
  });
});
