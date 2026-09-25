import {
  defaultChatMode,
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
    expect(isStudentPersona('Student')).toBe(true);
  });

  it('promotes Concept, Unknown, Misconception, Question first for students', () => {
    const types = orderedObjectTypes('student');
    expect(types.slice(0, 4)).toEqual(['concept', 'unknown', 'misconception', 'question']);
    expect(types).toContain('hypothesis');
    expect(orderedObjectTypes('inventor')[0]).toBe('thought');
  });

  it('aliases unknown and example-tagged evidence for students only', () => {
    expect(typeDisplayLabel('student', 'unknown')).toBe("I don't know yet");
    expect(typePluralDisplayLabel('student', 'unknown')).toBe("I don't know yet");
    expect(typeDisplayLabel('student', 'evidence', ['example'])).toBe('Example');
    expect(typeDisplayLabel('researcher', 'unknown')).toBe('Unknown');
    expect(typeDisplayLabel('student', 'evidence', ['paper'])).toBe('Evidence');
  });

  it('uses rival-explanation copy on student overlays', () => {
    expect(overlayCreateLabel('student')).toBe('Rival explanation');
    expect(overlayCreateLabel('explorer')).toBe('Create overlay');
  });
});
