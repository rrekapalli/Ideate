import { IdeaEdge, IdeaObject, OBJECT_TYPES, lookupLabel, lookupPluralLabel } from '@ideate/api-client';

export const STUDENT_PROMOTED_TYPES = ['concept', 'unknown', 'misconception', 'question'] as const;
export const INVENTOR_PROMOTED_TYPES = [
  'constraint',
  'target',
  'calculation',
  'architecture',
  'component',
  'hypothesis',
  'decision',
  'observation',
] as const;
export const EXPLORER_PROMOTED_TYPES = [
  'thought',
  'concept',
  'unknown',
  'question',
  'assumption',
  'hypothesis',
  'critique',
] as const;

export type StudentCardAction =
  | 'promote-question'
  | 'attach-example'
  | 'accept-example'
  | 'explain-shorter'
  | 'explain-fuller';

export type InventorCardAction =
  | 'relax'
  | 'tighten'
  | 'show-binds'
  | 'convert-observation'
  | 'recompute'
  | 'show-chain'
  | 'mark-estimate'
  | 'diff-bom'
  | 'add-component'
  | 'start-evaluation'
  | 'accept-evaluation'
  | 'reject-evaluation'
  | 'record-bench'
  | 'why-choice'
  | 'abandon'
  | 'resurrect'
  | 'extract-claims'
  | 'reuse';

export type ExplorerCardAction =
  | 'promote-concept'
  | 'promote-hypothesis'
  | 'walk-implications'
  | 'link-analogy'
  | 'reuse'
  | 'abandon'
  | 'resurrect';

export function isStudentPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'student';
}

export function isInventorPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'inventor';
}

export function isExplorerPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'explorer';
}

export function defaultChatMode(persona: string | null | undefined): string {
  if (isStudentPersona(persona)) {
    return 'learn';
  }
  if (isInventorPersona(persona)) {
    return 'challenge';
  }
  return 'explore';
}

export function composerPlaceholder(persona: string | null | undefined): string {
  if (isExplorerPersona(persona)) {
    return 'What thought is growing, and what should we not pretend to know?';
  }
  return 'Think out loud…';
}

export function orderedObjectTypes(persona: string | null | undefined): readonly string[] {
  if (isStudentPersona(persona)) {
    const promoted = new Set<string>(STUDENT_PROMOTED_TYPES);
    return [...STUDENT_PROMOTED_TYPES, ...OBJECT_TYPES.filter((t) => !promoted.has(t))];
  }
  if (isInventorPersona(persona)) {
    const promoted = new Set<string>(INVENTOR_PROMOTED_TYPES);
    return [...INVENTOR_PROMOTED_TYPES, ...OBJECT_TYPES.filter((t) => !promoted.has(t))];
  }
  if (isExplorerPersona(persona)) {
    const promoted = new Set<string>(EXPLORER_PROMOTED_TYPES);
    return [...EXPLORER_PROMOTED_TYPES, ...OBJECT_TYPES.filter((t) => !promoted.has(t))];
  }
  return OBJECT_TYPES;
}

export function typeDisplayLabel(
  persona: string | null | undefined,
  type: string,
  tags: readonly string[] = [],
): string {
  if (isStudentPersona(persona) || isExplorerPersona(persona)) {
    if (type === 'unknown') {
      return "I don't know yet";
    }
    if (isStudentPersona(persona) && type === 'evidence' && hasTag(tags, 'example')) {
      return 'Example';
    }
  }
  if (isInventorPersona(persona)) {
    if (type === 'hypothesis') {
      return 'Feasibility';
    }
    if (type === 'evidence' && hasTag(tags, 'datasheet')) {
      return 'Datasheet';
    }
    if (type === 'observation') {
      return 'Bench note';
    }
    if (type === 'component') {
      return 'Part';
    }
  }
  return lookupLabel(type);
}

export function typePluralDisplayLabel(
  persona: string | null | undefined,
  type: string,
): string {
  if ((isStudentPersona(persona) || isExplorerPersona(persona)) && type === 'unknown') {
    return "I don't know yet";
  }
  if (isInventorPersona(persona)) {
    if (type === 'hypothesis') {
      return 'Feasibility';
    }
    if (type === 'observation') {
      return 'Bench notes';
    }
    if (type === 'component') {
      return 'Parts';
    }
  }
  return lookupPluralLabel(type);
}

export function overlayCreateLabel(persona: string | null | undefined): string {
  if (isStudentPersona(persona)) {
    return 'Rival explanation';
  }
  if (isInventorPersona(persona)) {
    return 'Alternate architecture';
  }
  if (isExplorerPersona(persona)) {
    return 'Wild branch';
  }
  return 'Create overlay';
}

export function overlayNewLabel(persona: string | null | undefined): string {
  if (isStudentPersona(persona)) {
    return 'New rival explanation';
  }
  if (isInventorPersona(persona)) {
    return 'New alternate architecture';
  }
  if (isExplorerPersona(persona)) {
    return 'New wild branch';
  }
  return 'New overlay';
}

export function overlayNameFieldLabel(persona: string | null | undefined): string {
  if (isStudentPersona(persona)) {
    return 'Rival explanation name';
  }
  if (isInventorPersona(persona)) {
    return 'Alternate architecture name';
  }
  if (isExplorerPersona(persona)) {
    return 'Wild branch name';
  }
  return 'Overlay name';
}

export function hasTag(tags: readonly string[] | null | undefined, name: string): boolean {
  const want = name.toLowerCase();
  return (tags ?? []).some((t) => t.toLowerCase() === want);
}

export const EXPLAIN_SHORTER =
  'Rewrite this card shorter. Update summary and body on this node only. Do not create a second concept.';

export const EXPLAIN_FULLER =
  'Rewrite this card with a fuller explanation. Update summary and body on this node only. Do not create a second concept.';

export const EXTRACT_CLAIMS =
  'Extract claims from this design artifact. Mint Target, Calculation, Component, or Constraint cards and represented-by edges. Tag numbers as target or estimate, never fact. The image is not a measurement.';

export const WALK_IMPLICATIONS =
  'Follow what this card forces, including new problems. Mint Unknown or Question cards. Tag guesses speculation. Do not create a Theory, start an Evaluation, or write a full Critique.';

export interface EpistemicChip {
  kind: 'thought-experiment' | 'speculation' | 'evidence-backed' | 'unknown' | 'dropped';
  label: string;
  why?: string;
}

export function epistemicFooter(
  object: Pick<IdeaObject, 'id' | 'objectCategory' | 'tags'>,
  edges: readonly IdeaEdge[] = [],
): EpistemicChip | null {
  const category = (object.objectCategory ?? '').toLowerCase();
  if (category === 'abandoned') {
    return { kind: 'dropped', label: 'Dropped', why: abandonWhy(object.id, edges) };
  }
  if (hasTag(object.tags, 'thought-experiment')) {
    return { kind: 'thought-experiment', label: 'Thought experiment' };
  }
  if (hasTag(object.tags, 'speculation') || category === 'speculative') {
    return { kind: 'speculation', label: 'Speculation' };
  }
  if (hasTag(object.tags, 'evidence-backed') || category === 'supported') {
    return { kind: 'evidence-backed', label: 'Evidence-backed' };
  }
  if (category === 'unknown') {
    return { kind: 'unknown', label: 'Unknown' };
  }
  return null;
}

export function abandonWhy(objectId: string, edges: readonly IdeaEdge[]): string | undefined {
  const edge = edges.find(
    (e) => e.type === 'abandoned-because' && (e.fromObjectId === objectId || e.toObjectId === objectId),
  );
  const why = edge?.why?.trim();
  return why || undefined;
}
