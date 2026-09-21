export type LayoutNode = { id: string; width: number; height: number };
export type LayoutEdge = { from: string; to: string };
export type LayoutPos = { id: string; x: number; y: number };

const ORIGIN_X = 72;
const ORIGIN_Y = 72;
const H_GAP = 96;
const V_GAP = 64;

/** Left-to-right layered layout so out→in ports read as a flow and edges do not pile up. */
export function layoutGraph(nodes: LayoutNode[], edges: LayoutEdge[]): LayoutPos[] {
  if (nodes.length === 0) {
    return [];
  }
  const ids = new Set(nodes.map((n) => n.id));
  const ins = new Map<string, string[]>();
  const outs = new Map<string, string[]>();
  for (const n of nodes) {
    ins.set(n.id, []);
    outs.set(n.id, []);
  }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) {
      continue;
    }
    ins.get(e.to)!.push(e.from);
    outs.get(e.from)!.push(e.to);
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

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const colWidth: number[] = [];
  let maxLayerHeight = 0;
  for (let r = 0; r <= maxRank; r++) {
    const layer = layers.get(r) ?? [];
    colWidth[r] = layer.reduce((w, id) => Math.max(w, byId.get(id)?.width ?? 236), 180);
    const h = layer.reduce((sum, id, i) => sum + (byId.get(id)?.height ?? 160) + (i > 0 ? V_GAP : 0), 0);
    maxLayerHeight = Math.max(maxLayerHeight, h);
  }

  const positions: LayoutPos[] = [];
  let x = ORIGIN_X;
  for (let r = 0; r <= maxRank; r++) {
    const layer = layers.get(r) ?? [];
    const layerH = layer.reduce((sum, id, i) => sum + (byId.get(id)?.height ?? 160) + (i > 0 ? V_GAP : 0), 0);
    let y = ORIGIN_Y + Math.max(0, (maxLayerHeight - layerH) / 2);
    for (const id of layer) {
      const box = byId.get(id)!;
      positions.push({ id, x, y });
      y += box.height + V_GAP;
    }
    x += colWidth[r] + H_GAP;
  }
  return positions;
}

function barycenter(id: string, ins: Map<string, string[]>, index: Map<string, number>): number {
  const preds = (ins.get(id) ?? []).filter((p) => index.has(p));
  if (preds.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return preds.reduce((sum, p) => sum + (index.get(p) ?? 0), 0) / preds.length;
}
