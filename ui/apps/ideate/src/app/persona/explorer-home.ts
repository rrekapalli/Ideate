import { GraphSnapshot, IdeaObject } from '@ideate/api-client';
import { abandonWhy } from './persona-lens';

export interface DroppedItem {
  object: IdeaObject;
  why?: string;
}

export interface ExplorerHomeModel {
  growingThought: IdeaObject | null;
  unknowns: IdeaObject[];
  dropped: DroppedItem[];
}

export function deriveExplorerHome(
  snapshot: GraphSnapshot,
  lastFocusedThoughtId?: string | null,
): ExplorerHomeModel {
  const nodes = snapshot.nodes ?? [];
  const edges = snapshot.edges ?? [];
  const thoughts = nodes.filter((n) => n.type === 'thought' && n.objectCategory !== 'abandoned');
  const growingThought =
    (lastFocusedThoughtId && thoughts.find((n) => n.id === lastFocusedThoughtId)) ||
    newestByUpdated(thoughts);

  const unknowns = nodes.filter((n) => n.type === 'unknown' && n.objectCategory === 'unknown');

  const dropped = nodes
    .filter((n) => n.objectCategory === 'abandoned')
    .sort(byUpdatedDesc)
    .map((object) => ({ object, why: abandonWhy(object.id, edges) }));

  return { growingThought, unknowns, dropped };
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
