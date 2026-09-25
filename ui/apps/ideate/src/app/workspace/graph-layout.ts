import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';

export type LayoutNode = { id: string; width: number; height: number; type?: string };
export type LayoutEdge = { from: string; to: string };
export type LayoutPos = { id: string; x: number; y: number };
export type GraphLayoutMode = 'flow' | 'stack' | 'types' | 'grid' | 'organic' | 'radial';
export type GraphEdgeRouting = 'orthogonal' | 'bezier';

export const GRAPH_LAYOUTS: { id: GraphLayoutMode; label: string }[] = [
  { id: 'organic', label: 'Organic' },
  { id: 'radial', label: 'Radial' },
  { id: 'stack', label: 'Stack' },
  { id: 'types', label: 'Types' },
  { id: 'grid', label: 'Grid' },
  { id: 'flow', label: 'Flow' },
];

const ORIGIN_X = 72;
const ORIGIN_Y = 72;
const H_GAP = 96;
const V_GAP = 64;

export function nextGraphLayout(mode: GraphLayoutMode): GraphLayoutMode {
  const i = GRAPH_LAYOUTS.findIndex((m) => m.id === mode);
  return GRAPH_LAYOUTS[(i + 1) % GRAPH_LAYOUTS.length].id;
}

export function graphLayoutLabel(mode: GraphLayoutMode): string {
  return GRAPH_LAYOUTS.find((m) => m.id === mode)?.label ?? 'Organic';
}

export function parseGraphLayout(raw: string | null | undefined): GraphLayoutMode {
  return GRAPH_LAYOUTS.some((m) => m.id === raw) ? (raw as GraphLayoutMode) : 'organic';
}

export function graphLayoutRouting(mode: GraphLayoutMode): GraphEdgeRouting {
  return mode === 'organic' || mode === 'radial' ? 'bezier' : 'orthogonal';
}

/** Place cards so relationships stay readable; mode picks the arrangement. */
export function layoutGraph(nodes: LayoutNode[], edges: LayoutEdge[], mode: GraphLayoutMode = 'organic'): LayoutPos[] {
  if (nodes.length === 0) {
    return [];
  }
  if (mode === 'types') {
    return layoutByType(nodes);
  }
  if (mode === 'grid') {
    return layoutGrid(nodes);
  }
  if (mode === 'organic') {
    return layoutOrganic(nodes, edges);
  }
  if (mode === 'radial') {
    return layoutRadial(nodes, edges);
  }
  const layers = rankedLayers(nodes, edges);
  return mode === 'stack' ? placeTopDown(nodes, layers) : placeLeftToRight(nodes, layers);
}

function rankedLayers(nodes: LayoutNode[], edges: LayoutEdge[]): string[][] {
  const ids = new Set(nodes.map((n) => n.id));
  const ins = new Map<string, string[]>();
  for (const n of nodes) {
    ins.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) {
      continue;
    }
    ins.get(e.to)!.push(e.from);
  }

  const rank = new Map<string, number>();
  const visiting = new Set<string>();
  const walk = (id: string): number => {
    const cached = rank.get(id);
    if (cached !== undefined) {
      return cached;
    }
    if (visiting.has(id)) {
      return 0;
    }
    visiting.add(id);
    let r = 0;
    for (const pred of ins.get(id) ?? []) {
      r = Math.max(r, walk(pred) + 1);
    }
    visiting.delete(id);
    rank.set(id, r);
    return r;
  };
  for (const n of nodes) {
    walk(n.id);
  }

  const layers = new Map<number, string[]>();
  let maxRank = 0;
  for (const n of nodes) {
    const r = rank.get(n.id) ?? 0;
    maxRank = Math.max(maxRank, r);
    const layer = layers.get(r) ?? [];
    layer.push(n.id);
    layers.set(r, layer);
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let r = 1; r <= maxRank; r++) {
      const prev = layers.get(r - 1) ?? [];
      const index = new Map(prev.map((id, i) => [id, i]));
      const layer = layers.get(r) ?? [];
      layer.sort((a, b) => barycenter(a, ins, index) - barycenter(b, ins, index));
      layers.set(r, layer);
    }
  }

  const ordered: string[][] = [];
  for (let r = 0; r <= maxRank; r++) {
    ordered.push(layers.get(r) ?? []);
  }
  return ordered;
}

function placeLeftToRight(nodes: LayoutNode[], layers: string[][]): LayoutPos[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const colWidth = layers.map((layer) => layer.reduce((w, id) => Math.max(w, byId.get(id)?.width ?? 236), 180));
  const heights = layers.map((layer) => layerHeight(layer, byId));
  const maxLayerHeight = Math.max(0, ...heights);
  const positions: LayoutPos[] = [];
  let x = ORIGIN_X;
  for (let r = 0; r < layers.length; r++) {
    const layer = layers[r];
    let y = ORIGIN_Y + Math.max(0, (maxLayerHeight - heights[r]) / 2);
    for (const id of layer) {
      const box = byId.get(id)!;
      positions.push({ id, x, y });
      y += box.height + V_GAP;
    }
    x += colWidth[r] + H_GAP;
  }
  return positions;
}

function placeTopDown(nodes: LayoutNode[], layers: string[][]): LayoutPos[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const widths = layers.map((layer) => layerWidth(layer, byId));
  const maxLayerWidth = Math.max(0, ...widths);
  const positions: LayoutPos[] = [];
  let y = ORIGIN_Y;
  for (let r = 0; r < layers.length; r++) {
    const layer = layers[r];
    let x = ORIGIN_X + Math.max(0, (maxLayerWidth - widths[r]) / 2);
    let rowH = 0;
    for (const id of layer) {
      const box = byId.get(id)!;
      positions.push({ id, x, y });
      x += box.width + H_GAP;
      rowH = Math.max(rowH, box.height);
    }
    y += rowH + V_GAP;
  }
  return positions;
}

function layoutByType(nodes: LayoutNode[]): LayoutPos[] {
  const groups = new Map<string, LayoutNode[]>();
  for (const n of nodes) {
    const key = n.type || 'thought';
    const list = groups.get(key) ?? [];
    list.push(n);
    groups.set(key, list);
  }
  const positions: LayoutPos[] = [];
  let x = ORIGIN_X;
  for (const group of groups.values()) {
    const colW = group.reduce((w, n) => Math.max(w, n.width), 180);
    let y = ORIGIN_Y;
    for (const n of group) {
      positions.push({ id: n.id, x, y });
      y += n.height + V_GAP;
    }
    x += colW + H_GAP;
  }
  return positions;
}

function layoutGrid(nodes: LayoutNode[]): LayoutPos[] {
  const cols = Math.max(2, Math.ceil(Math.sqrt(nodes.length)));
  const positions: LayoutPos[] = [];
  let i = 0;
  let y = ORIGIN_Y;
  while (i < nodes.length) {
    const row = nodes.slice(i, i + cols);
    const rowH = row.reduce((h, n) => Math.max(h, n.height), 160);
    let x = ORIGIN_X;
    for (const n of row) {
      positions.push({ id: n.id, x, y });
      x += n.width + H_GAP;
    }
    y += rowH + V_GAP;
    i += cols;
  }
  return positions;
}

type ForceNode = LayoutNode & SimulationNodeDatum;
type ForceLink = SimulationLinkDatum<ForceNode> & { source: string | ForceNode; target: string | ForceNode };

function layoutOrganic(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutPos[] {
  const seed = layoutGrid(nodes);
  const start = new Map(seed.map((p) => [p.id, p]));
  const simNodes: ForceNode[] = nodes.map((n) => {
    const p = start.get(n.id)!;
    return { ...n, x: p.x + n.width / 2, y: p.y + n.height / 2, vx: 0, vy: 0 };
  });
  const ids = new Set(nodes.map((n) => n.id));
  const links: ForceLink[] = edges
    .filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to)
    .map((e) => ({ source: e.from, target: e.to }));
  const byId = new Map(simNodes.map((n) => [n.id, n]));
  const linkDistance = (link: ForceLink): number => {
    const a = typeof link.source === 'string' ? byId.get(link.source) : link.source;
    const b = typeof link.target === 'string' ? byId.get(link.target) : link.target;
    const aw = a?.width ?? 236;
    const ah = a?.height ?? 160;
    const bw = b?.width ?? 236;
    const bh = b?.height ?? 160;
    return Math.hypot(aw, ah) / 2 + Math.hypot(bw, bh) / 2 + 80;
  };
  const sim = forceSimulation(simNodes)
    .force(
      'link',
      forceLink<ForceNode, ForceLink>(links)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(0.45),
    )
    .force('charge', forceManyBody().strength(-420))
    .force(
      'collide',
      forceCollide<ForceNode>()
        .radius((d) => Math.hypot(d.width, d.height) / 2 + 28)
        .iterations(3),
    )
    .force('center', forceCenter(ORIGIN_X + 420, ORIGIN_Y + 280))
    .stop();
  for (let i = 0; i < 220; i++) {
    sim.tick();
  }
  for (const n of simNodes) {
    n.x = (n.x ?? ORIGIN_X) - n.width / 2;
    n.y = (n.y ?? ORIGIN_Y) - n.height / 2;
  }
  resolveOverlaps(simNodes, 20);
  return simNodes.map((n) => ({ id: n.id, x: n.x ?? ORIGIN_X, y: n.y ?? ORIGIN_Y }));
}

function layoutRadial(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutPos[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ids = new Set(nodes.map((n) => n.id));
  const outs = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const n of nodes) {
    outs.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) {
      continue;
    }
    outs.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  const roots = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const start = roots.length ? roots : [nodes[0].id];
  const depth = new Map<string, number>();
  const queue = [...start];
  for (const id of start) {
    depth.set(id, 0);
  }
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const next of outs.get(id) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  for (const n of nodes) {
    if (!depth.has(n.id)) {
      depth.set(n.id, 0);
    }
  }

  const rings = new Map<number, LayoutNode[]>();
  let maxDepth = 0;
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    maxDepth = Math.max(maxDepth, d);
    const ring = rings.get(d) ?? [];
    ring.push(n);
    rings.set(d, ring);
  }
  for (const ring of rings.values()) {
    ring.sort((a, b) => a.id.localeCompare(b.id));
  }

  const radii: number[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const ring = rings.get(d) ?? [];
    const count = Math.max(1, ring.length);
    const maxBox = ring.reduce((m, n) => Math.max(m, n.width, n.height), 160);
    const chordNeed = count === 1 ? 0 : (maxBox + H_GAP) / (2 * Math.sin(Math.PI / count));
    const prevRadius = d === 0 ? 0 : radii[d - 1];
    const prevMax = d === 0 ? 0 : (rings.get(d - 1) ?? []).reduce((m, n) => Math.max(m, n.width, n.height), 160);
    const fromPrev = d === 0 ? chordNeed : prevRadius + prevMax / 2 + maxBox / 2 + V_GAP;
    radii[d] = Math.max(chordNeed, fromPrev);
  }

  const span = radii[maxDepth] || 200;
  const cx = ORIGIN_X + span + 200;
  const cy = ORIGIN_Y + span + 200;
  const positions: LayoutPos[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const ring = rings.get(d) ?? [];
    const r = radii[d];
    const count = ring.length;
    for (let i = 0; i < count; i++) {
      const node = ring[i];
      const angle = -Math.PI / 2 + (count === 0 ? 0 : (2 * Math.PI * i) / count);
      positions.push({
        id: node.id,
        x: cx + r * Math.cos(angle) - node.width / 2,
        y: cy + r * Math.sin(angle) - node.height / 2,
      });
    }
  }
  return positions.filter((p) => byId.has(p.id));
}

function resolveOverlaps(nodes: ForceNode[], gap: number): void {
  for (let pass = 0; pass < 24; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const ax = (a.x ?? 0) + a.width / 2;
        const ay = (a.y ?? 0) + a.height / 2;
        const bx = (b.x ?? 0) + b.width / 2;
        const by = (b.y ?? 0) + b.height / 2;
        const overlapX = (a.width + b.width) / 2 + gap - Math.abs(ax - bx);
        const overlapY = (a.height + b.height) / 2 + gap - Math.abs(ay - by);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }
        moved = true;
        const push = Math.min(overlapX, overlapY) / 2;
        if (overlapX < overlapY) {
          const sx = ax === bx ? 1 : Math.sign(ax - bx);
          a.x = (a.x ?? 0) + sx * push;
          b.x = (b.x ?? 0) - sx * push;
        } else {
          const sy = ay === by ? 1 : Math.sign(ay - by);
          a.y = (a.y ?? 0) + sy * push;
          b.y = (b.y ?? 0) - sy * push;
        }
      }
    }
    if (!moved) {
      return;
    }
  }
}

function layerHeight(layer: string[], byId: Map<string, LayoutNode>): number {
  return layer.reduce((sum, id, i) => sum + (byId.get(id)?.height ?? 160) + (i > 0 ? V_GAP : 0), 0);
}

function layerWidth(layer: string[], byId: Map<string, LayoutNode>): number {
  return layer.reduce((sum, id, i) => sum + (byId.get(id)?.width ?? 236) + (i > 0 ? H_GAP : 0), 0);
}

function barycenter(id: string, ins: Map<string, string[]>, index: Map<string, number>): number {
  const preds = (ins.get(id) ?? []).filter((p) => index.has(p));
  if (preds.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return preds.reduce((sum, p) => sum + (index.get(p) ?? 0), 0) / preds.length;
}
