export type LayoutNode = { id: string; width: number; height: number; type?: string };
export type LayoutEdge = { from: string; to: string };
export type LayoutPos = { id: string; x: number; y: number };
export type GraphLayoutMode = 'flow' | 'stack' | 'types' | 'grid';

export const GRAPH_LAYOUTS: { id: GraphLayoutMode; label: string }[] = [
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
  return GRAPH_LAYOUTS.find((m) => m.id === mode)?.label ?? 'Stack';
}

export function parseGraphLayout(raw: string | null | undefined): GraphLayoutMode {
  return GRAPH_LAYOUTS.some((m) => m.id === raw) ? (raw as GraphLayoutMode) : 'stack';
}

/** Place cards so relationships stay readable; mode picks the arrangement. */
export function layoutGraph(nodes: LayoutNode[], edges: LayoutEdge[], mode: GraphLayoutMode = 'stack'): LayoutPos[] {
  if (nodes.length === 0) {
    return [];
  }
  if (mode === 'types') {
    return layoutByType(nodes);
  }
  if (mode === 'grid') {
    return layoutGrid(nodes);
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
