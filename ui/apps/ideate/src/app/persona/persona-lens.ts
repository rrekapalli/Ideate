import { OBJECT_TYPES, lookupLabel, lookupPluralLabel } from '@ideate/api-client';

export const STUDENT_PROMOTED_TYPES = ['concept', 'unknown', 'misconception', 'question'] as const;

export type StudentCardAction =
  | 'promote-question'
  | 'attach-example'
  | 'accept-example'
  | 'explain-shorter'
  | 'explain-fuller';

export function isStudentPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'student';
}

export function defaultChatMode(persona: string | null | undefined): string {
  return isStudentPersona(persona) ? 'learn' : 'explore';
}

export function orderedObjectTypes(persona: string | null | undefined): readonly string[] {
  if (!isStudentPersona(persona)) {
    return OBJECT_TYPES;
  }
  const promoted = new Set<string>(STUDENT_PROMOTED_TYPES);
  return [...STUDENT_PROMOTED_TYPES, ...OBJECT_TYPES.filter((t) => !promoted.has(t))];
}

export function typeDisplayLabel(
  persona: string | null | undefined,
  type: string,
  tags: readonly string[] = [],
): string {
  if (isStudentPersona(persona)) {
    if (type === 'unknown') {
      return "I don't know yet";
    }
    if (type === 'evidence' && hasTag(tags, 'example')) {
      return 'Example';
    }
  }
  return lookupLabel(type);
}

export function typePluralDisplayLabel(
  persona: string | null | undefined,
  type: string,
): string {
  if (isStudentPersona(persona) && type === 'unknown') {
    return "I don't know yet";
  }
  return lookupPluralLabel(type);
}

export function overlayCreateLabel(persona: string | null | undefined): string {
  return isStudentPersona(persona) ? 'Rival explanation' : 'Create overlay';
}

export function overlayNewLabel(persona: string | null | undefined): string {
  return isStudentPersona(persona) ? 'New rival explanation' : 'New overlay';
}

export function overlayNameFieldLabel(persona: string | null | undefined): string {
  return isStudentPersona(persona) ? 'Rival explanation name' : 'Overlay name';
}

export function hasTag(tags: readonly string[] | null | undefined, name: string): boolean {
  const want = name.toLowerCase();
  return (tags ?? []).some((t) => t.toLowerCase() === want);
}

export const EXPLAIN_SHORTER =
  'Rewrite this card shorter. Update summary and body on this node only. Do not create a second concept.';

export const EXPLAIN_FULLER =
  'Rewrite this card with a fuller explanation. Update summary and body on this node only. Do not create a second concept.';
