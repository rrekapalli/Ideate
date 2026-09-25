import { GraphSnapshot, IdeaEdge, IdeaObject } from '@ideate/api-client';
import { abandonWhy } from './persona-lens';

export interface KilledBet {
  object: IdeaObject;
  why?: string;
}

export interface ProductHomeModel {
  pinnedProblem: IdeaObject | null;
  liveBets: IdeaObject[];
  openAssumptions: IdeaObject[];
  decisions: IdeaObject[];
  killedBets: KilledBet[];
}

export interface AssumptionBreak {
  object: IdeaObject;
  via: string;
}

export interface DecisionReplay {
  decision: IdeaObject;
  disposition?: string;
  choice?: string;
  reason?: string;
  alternatives: string[];
  outcome?: string;
  versions: { version: number; disposition?: string; choice?: string }[];
  bets: IdeaObject[];
  abandonWhy?: string;
  weakeningEvidence: IdeaObject[];
  assumptions: IdeaObject[];
  constraints: IdeaObject[];
  outcomeObservation: IdeaObject | null;
}

function newestByUpdated(nodes: IdeaObject[]): IdeaObject | null {
  if (!nodes.length) {
    return null;
  }
  return [...nodes].sort(byUpdatedDesc)[0];
}

function byUpdatedDesc(a: IdeaObject, b: IdeaObject): number {
  return (b.updatedAt || '').localeCompare(a.updatedAt || '');
}

function detailText(object: IdeaObject | undefined, key: string): string | undefined {
  if (!object?.details) {
    return undefined;
  }
  const value = object.details[key];
  if (value == null) {
    return undefined;
  }
  const text = String(value).trim();
  return text && text !== 'null' ? text : undefined;
}

function detailList(object: IdeaObject | undefined, key: string): string[] {
  const raw = object?.details?.[key];
  if (Array.isArray(raw)) {
    return raw.map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function neighbors(
  edges: readonly IdeaEdge[],
  byId: Map<string, IdeaObject>,
  objectId: string,
  types?: string[],
): IdeaObject[] {
  const found: IdeaObject[] = [];
  for (const e of edges) {
    if (e.fromObjectId !== objectId && e.toObjectId !== objectId) {
      continue;
    }
    const otherId = e.fromObjectId === objectId ? e.toObjectId : e.fromObjectId;
    const node = byId.get(otherId);
    if (!node || found.some((n) => n.id === node.id)) {
      continue;
    }
    if (types && !types.includes(node.type)) {
      continue;
    }
    found.push(node);
  }
  return found;
}

function tiedToDecision(objectId: string, edges: readonly IdeaEdge[], byId: Map<string, IdeaObject>): boolean {
  for (const e of edges) {
    const other =
      e.fromObjectId === objectId ? byId.get(e.toObjectId) : e.toObjectId === objectId ? byId.get(e.fromObjectId) : null;
    if (other?.type === 'decision') {
      return true;
    }
  }
  return false;
}

export function deriveProductHome(
  snapshot: GraphSnapshot,
  pinnedObjectId?: string | null,
): ProductHomeModel {
  const nodes = snapshot.nodes ?? [];
  const edges = snapshot.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const questions = nodes.filter((n) => n.type === 'question' && n.objectCategory !== 'abandoned');
  const pinnedProblem =
    (pinnedObjectId && byId.get(pinnedObjectId)?.type === 'question' ? byId.get(pinnedObjectId)! : null) ||
    newestByUpdated(questions);

  const liveBets = nodes
    .filter((n) => n.type === 'hypothesis' && n.objectCategory !== 'abandoned')
    .sort(byUpdatedDesc);

  const openAssumptions = nodes
    .filter(
      (n) =>
        n.type === 'assumption' &&
        n.objectCategory !== 'abandoned' &&
        !tiedToDecision(n.id, edges, byId),
    )
    .sort(byUpdatedDesc);

  const decisions = nodes
    .filter((n) => n.type === 'decision' && n.objectCategory !== 'abandoned')
    .sort(byUpdatedDesc);

  const killedBets = nodes
    .filter((n) => n.type === 'hypothesis' && n.objectCategory === 'abandoned')
    .sort(byUpdatedDesc)
    .map((object) => ({ object, why: abandonWhy(object.id, edges) }));

  return { pinnedProblem, liveBets, openAssumptions, decisions, killedBets };
}

export function assumptionBreaks(
  snapshot: GraphSnapshot,
  assumptionId: string,
): AssumptionBreak[] {
  const nodes = snapshot.nodes ?? [];
  const edges = snapshot.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>([assumptionId]);
  const queue = [assumptionId];
  const found: AssumptionBreak[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    for (const e of edges) {
      if (e.type !== 'assumes' && e.type !== 'derived-from' && e.type !== 'led-to') {
        continue;
      }
      const otherId = e.fromObjectId === current ? e.toObjectId : e.toObjectId === current ? e.fromObjectId : null;
      if (!otherId || seen.has(otherId)) {
        continue;
      }
      const node = byId.get(otherId);
      if (!node) {
        continue;
      }
      seen.add(otherId);
      if (node.type === 'hypothesis' || node.type === 'decision' || node.type === 'assumption') {
        found.push({ object: node, via: e.type });
        queue.push(otherId);
      }
    }
  }
  return found.filter((row) => row.object.type === 'decision' || row.object.type === 'hypothesis');
}

export function deriveDecisionReplay(
  snapshot: GraphSnapshot,
  decision: IdeaObject,
): DecisionReplay {
  const nodes = snapshot.nodes ?? [];
  const edges = snapshot.edges ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const bets = neighbors(edges, byId, decision.id, ['hypothesis']);
  const abandon = bets.map((b) => abandonWhy(b.id, edges)).find(Boolean);
  const weakeningEvidence: IdeaObject[] = [];
  const assumptions: IdeaObject[] = [];
  for (const bet of bets) {
    for (const n of neighbors(edges, byId, bet.id, ['evidence', 'observation', 'critique'])) {
      const weak = edges.some(
        (e) =>
          e.type === 'contradicts' &&
          ((e.fromObjectId === n.id && e.toObjectId === bet.id) ||
            (e.toObjectId === n.id && e.fromObjectId === bet.id)),
      );
      if (weak && !weakeningEvidence.some((x) => x.id === n.id)) {
        weakeningEvidence.push(n);
      }
    }
    for (const n of neighbors(edges, byId, bet.id, ['assumption'])) {
      if (!assumptions.some((x) => x.id === n.id)) {
        assumptions.push(n);
      }
    }
  }
  const constraints = nodes.filter((n) => n.type === 'constraint' && n.objectCategory !== 'abandoned');
  const outcomeId = detailText(decision, 'outcomeObservationId');
  const outcomeObservation = outcomeId ? byId.get(outcomeId) ?? null : null;
  const versions = detailList(decision, 'alternatives').length || decision.version
    ? [{ version: decision.version, disposition: detailText(decision, 'disposition'), choice: detailText(decision, 'choice') }]
    : [];
  return {
    decision,
    disposition: detailText(decision, 'disposition'),
    choice: detailText(decision, 'choice'),
    reason: detailText(decision, 'reason'),
    alternatives: detailList(decision, 'alternatives'),
    outcome: detailText(decision, 'outcome'),
    versions,
    bets,
    abandonWhy: abandon,
    weakeningEvidence,
    assumptions,
    constraints,
    outcomeObservation,
  };
}
