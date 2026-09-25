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

export type PortSide = 'top' | 'right' | 'bottom' | 'left';
export type EdgePorts = { sourcePort: PortSide; targetPort: PortSide };
export type PlacedNode = { id: string; x: number; y: number; width: number; height: number };

const PORT_SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];

const PORT_CLEAR = 28;

/** Pick a midpoint pair that faces the neighbor, stays unused, and does not pile on another edge. */
export function assignEdgePorts(nodes: PlacedNode[], edges: LayoutEdge[]): EdgePorts[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const used = new Map<string, Record<PortSide, number>>();
  for (const n of nodes) {
    used.set(n.id, { top: 0, right: 0, bottom: 0, left: 0 });
  }
  const placed: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  const result: EdgePorts[] = edges.map(() => ({ sourcePort: 'right' as PortSide, targetPort: 'left' as PortSide }));
  const order = edges
    .map((e, i) => {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      return { i, e, span: edgeSpan(from, to), clarity: axisClarity(from, to) };
    })
    .sort((a, b) => b.clarity - a.clarity || b.span - a.span);

  for (const item of order) {
    const from = byId.get(item.e.from);
    const to = byId.get(item.e.to);
    if (!from || !to) {
      continue;
    }
    const pick = bestPair(from, to, used.get(from.id)!, used.get(to.id)!, placed);
    result[item.i] = pick;
    used.get(from.id)![pick.sourcePort] += 1;
    used.get(to.id)![pick.targetPort] += 1;
    placed.push({ a: portPoint(from, pick.sourcePort), b: portPoint(to, pick.targetPort) });
  }
  return result;
}

function edgeSpan(from: PlacedNode | undefined, to: PlacedNode | undefined): number {
  if (!from || !to) {
    return 0;
  }
  return Math.hypot(center(to).x - center(from).x, center(to).y - center(from).y);
}

function axisClarity(from: PlacedNode | undefined, to: PlacedNode | undefined): number {
  if (!from || !to) {
    return 0;
  }
  const dx = Math.abs(center(to).x - center(from).x);
  const dy = Math.abs(center(to).y - center(from).y);
  return Math.abs(dx - dy) / (dx + dy + 1);
}

function isDiagonal(from: PlacedNode, to: PlacedNode): boolean {
  const dx = Math.abs(center(to).x - center(from).x);
  const dy = Math.abs(center(to).y - center(from).y);
  const ratio = Math.min(dx, dy) / Math.max(dx, dy, 1);
  return ratio > 0.4 && dx > 40 && dy > 40;
}

function bestPair(
  from: PlacedNode,
  to: PlacedNode,
  fromUse: Record<PortSide, number>,
  toUse: Record<PortSide, number>,
  placed: { a: { x: number; y: number }; b: { x: number; y: number } }[],
): EdgePorts {
  let best: EdgePorts = { sourcePort: 'right', targetPort: 'left' };
  let bestCost = Number.POSITIVE_INFINITY;
  for (const sourcePort of PORT_SIDES) {
    for (const targetPort of PORT_SIDES) {
      const cost = pairCost(from, to, sourcePort, targetPort, fromUse, toUse, placed);
      if (cost < bestCost) {
        bestCost = cost;
        best = { sourcePort, targetPort };
      }
    }
  }
  return best;
}

function pairCost(
  from: PlacedNode,
  to: PlacedNode,
  sourcePort: PortSide,
  targetPort: PortSide,
  fromUse: Record<PortSide, number>,
  toUse: Record<PortSide, number>,
  placed: { a: { x: number; y: number }; b: { x: number; y: number } }[],
): number {
  const a = portPoint(from, sourcePort);
  const b = portPoint(to, targetPort);
  const fc = center(from);
  const tc = center(to);
  const diagonal = isDiagonal(from, to);
  const lShape = isHorizontal(sourcePort) !== isHorizontal(targetPort);
  let clashes = 0;
  for (const seg of placed) {
    if (segmentsInterfere(a, b, seg.a, seg.b)) {
      clashes += 1;
    }
  }
  return (
    (fromUse[sourcePort] + toUse[targetPort]) * 8000 +
    clashes * 4000 +
    Math.hypot(b.x - a.x, b.y - a.y) +
    (faceScore(sourcePort, tc.x - fc.x, tc.y - fc.y) < 0 ? 900 : 0) +
    (faceScore(targetPort, fc.x - tc.x, fc.y - tc.y) < 0 ? 900 : 0) +
    (diagonal && !lShape ? 700 : 0) +
    (diagonal && lShape ? -180 : 0)
  );
}

function isHorizontal(side: PortSide): boolean {
  return side === 'left' || side === 'right';
}

function faceScore(side: PortSide, dx: number, dy: number): number {
  if (side === 'right') {
    return dx;
  }
  if (side === 'left') {
    return -dx;
  }
  if (side === 'bottom') {
    return dy;
  }
  return -dy;
}

function center(n: PlacedNode): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

function portPoint(n: PlacedNode, side: PortSide): { x: number; y: number } {
  if (side === 'left') {
    return { x: n.x, y: n.y + n.height / 2 };
  }
  if (side === 'right') {
    return { x: n.x + n.width, y: n.y + n.height / 2 };
  }
  if (side === 'top') {
    return { x: n.x + n.width / 2, y: n.y };
  }
  return { x: n.x + n.width / 2, y: n.y + n.height };
}

function segmentsInterfere(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  if (samePoint(a1, b1) || samePoint(a1, b2) || samePoint(a2, b1) || samePoint(a2, b2)) {
    return false;
  }
  if (properIntersect(a1, a2, b1, b2)) {
    return true;
  }
  return segmentDistance(a1, a2, b1, b2) < PORT_CLEAR && projectionsOverlap(a1, a2, b1, b2);
}

function samePoint(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}

function properIntersect(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function orient(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function segmentDistance(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): number {
  return Math.min(
    pointSegDist(a1, b1, b2),
    pointSegDist(a2, b1, b2),
    pointSegDist(b1, a1, a2),
    pointSegDist(b2, a1, a2),
  );
}

function pointSegDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function projectionsOverlap(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  const overlap = (p1: number, p2: number, q1: number, q2: number) =>
    Math.min(p1, p2) < Math.max(q1, q2) - 2 && Math.min(q1, q2) < Math.max(p1, p2) - 2;
  return overlap(a1.x, a2.x, b1.x, b2.x) || overlap(a1.y, a2.y, b1.y, b2.y);
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
