import { IdeaEdge, IdeaObject, OBJECT_TYPES, lookupLabel, lookupPluralLabel } from '@ideate/api-client';

export const STUDENT_PROMOTED_TYPES = ['concept', 'unknown', 'misconception', 'question'] as const;
export const PRODUCT_RESEARCH_PROMOTED_TYPES = [
  'question',
  'hypothesis',
  'assumption',
  'evidence',
  'experiment',
  'observation',
  'critique',
  'decision',
  'constraint',
] as const;
export const INVENTOR_DESIGN_TYPES = ['target', 'calculation', 'architecture', 'component'] as const;
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

export type ProductCardAction =
  | 'pin-problem'
  | 'assumption-break'
  | 'add-research-note'
  | 'critique-bet'
  | 'record-test'
  | 'record-result'
  | 'decide'
  | 'write-outcome'
  | 'replay'
  | 'abandon'
  | 'resurrect'
  | 'reuse';

export function isStudentPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'student';
}

export function isInventorPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'inventor';
}

export function isExplorerPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'explorer';
}

export function isAnalystPersona(persona: string | null | undefined): boolean {
  return (persona ?? '').toLowerCase() === 'analyst';
}

export function isProductResearchPersona(persona: string | null | undefined): boolean {
  return isAnalystPersona(persona) || isInventorPersona(persona);
}

export function defaultChatMode(persona: string | null | undefined): string {
  if (isStudentPersona(persona)) {
    return 'learn';
  }
  if (isInventorPersona(persona) || isAnalystPersona(persona)) {
    return 'challenge';
  }
  return 'explore';
}

export function composerPlaceholder(persona: string | null | undefined): string {
  if (isExplorerPersona(persona)) {
    return 'What thought is growing, and what should we not pretend to know?';
  }
  if (isAnalystPersona(persona)) {
    return 'Why this decision, and what would change our mind?';
  }
  if (isInventorPersona(persona)) {
    return 'What problem does this concept solve, and what new problems does it create?';
  }
  return 'Think out loud…';
}

export function orderedObjectTypes(persona: string | null | undefined): readonly string[] {
  if (isStudentPersona(persona)) {
    const promoted = new Set<string>(STUDENT_PROMOTED_TYPES);
    return [...STUDENT_PROMOTED_TYPES, ...OBJECT_TYPES.filter((t) => !promoted.has(t))];
  }
  if (isProductResearchPersona(persona)) {
    const promoted: string[] = [...PRODUCT_RESEARCH_PROMOTED_TYPES];
    if (isInventorPersona(persona)) {
      for (const t of INVENTOR_DESIGN_TYPES) {
        if (!promoted.includes(t)) {
          promoted.push(t);
        }
      }
    }
    const seen = new Set(promoted);
    return [...promoted, ...OBJECT_TYPES.filter((t) => !seen.has(t))];
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
  if (isProductResearchPersona(persona)) {
    if (type === 'question') {
      return 'Problem';
    }
    if (type === 'hypothesis') {
      return 'Bet';
    }
    if (type === 'evidence') {
      if (isInventorPersona(persona) && hasTag(tags, 'datasheet')) {
        return 'Datasheet';
      }
      return 'Research note';
    }
    if (type === 'experiment') {
      return 'Test';
    }
    if (type === 'observation') {
      return 'Result';
    }
    if (isInventorPersona(persona) && type === 'component') {
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
  if (isProductResearchPersona(persona)) {
    if (type === 'question') {
      return 'Problems';
    }
    if (type === 'hypothesis') {
      return 'Bets';
    }
    if (type === 'evidence') {
      return 'Research notes';
    }
    if (type === 'experiment') {
      return 'Tests';
    }
    if (type === 'observation') {
      return 'Results';
    }
    if (isInventorPersona(persona) && type === 'component') {
      return 'Parts';
    }
  }
  return lookupPluralLabel(type);
}

export function overlayCreateLabel(persona: string | null | undefined): string {
  if (isStudentPersona(persona)) {
    return 'Rival explanation';
  }
  if (isProductResearchPersona(persona)) {
    return 'Rival product shape';
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
  if (isProductResearchPersona(persona)) {
    return 'New rival product shape';
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
  if (isProductResearchPersona(persona)) {
    return 'Rival product shape name';
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
  kind: 'thought-experiment' | 'speculation' | 'evidence-backed' | 'unknown' | 'dropped' | 'heard' | 'concluded' | 'do-not-quote';
  label: string;
  why?: string;
}

export function epistemicChips(
  object: Pick<IdeaObject, 'id' | 'objectCategory' | 'tags'>,
  edges: readonly IdeaEdge[] = [],
): EpistemicChip[] {
  const chips: EpistemicChip[] = [];
  const category = (object.objectCategory ?? '').toLowerCase();
  if (category === 'abandoned') {
    chips.push({ kind: 'dropped', label: 'Dropped', why: abandonWhy(object.id, edges) });
  }
  if (hasTag(object.tags, 'do-not-quote')) {
    chips.push({ kind: 'do-not-quote', label: 'Do not quote' });
  }
  if (hasTag(object.tags, 'heard')) {
    chips.push({ kind: 'heard', label: 'Heard' });
  }
  if (hasTag(object.tags, 'concluded')) {
    chips.push({ kind: 'concluded', label: 'Concluded' });
  }
  if (hasTag(object.tags, 'thought-experiment')) {
    chips.push({ kind: 'thought-experiment', label: 'Thought experiment' });
  } else if (hasTag(object.tags, 'speculation') || category === 'speculative') {
    chips.push({ kind: 'speculation', label: 'Speculation' });
  } else if (hasTag(object.tags, 'evidence-backed') || category === 'supported') {
    chips.push({ kind: 'evidence-backed', label: 'Evidence-backed' });
  } else if (category === 'unknown') {
    chips.push({ kind: 'unknown', label: 'Unknown' });
  }
  return chips;
}

export function epistemicFooter(
  object: Pick<IdeaObject, 'id' | 'objectCategory' | 'tags'>,
  edges: readonly IdeaEdge[] = [],
): EpistemicChip | null {
  return epistemicChips(object, edges)[0] ?? null;
}

export function abandonWhy(objectId: string, edges: readonly IdeaEdge[]): string | undefined {
  const edge = edges.find(
    (e) => e.type === 'abandoned-because' && (e.fromObjectId === objectId || e.toObjectId === objectId),
  );
  const why = edge?.why?.trim();
  return why || undefined;
}
