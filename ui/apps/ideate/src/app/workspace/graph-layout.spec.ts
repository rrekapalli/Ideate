import { assignEdgePorts, graphLayoutRouting, layoutGraph, nextGraphLayout, parseGraphLayout } from './graph-layout';

const nodes = [
  { id: 'a', width: 100, height: 40, type: 'question' },
  { id: 'b', width: 100, height: 40, type: 'hypothesis' },
  { id: 'c', width: 100, height: 40, type: 'question' },
];
const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];

describe('graph-layout', () => {
  it('cycles Organic → Radial → Stack → Types → Grid → Flow → Organic', () => {
    expect(nextGraphLayout('organic')).toBe('radial');
    expect(nextGraphLayout('radial')).toBe('stack');
    expect(nextGraphLayout('stack')).toBe('types');
    expect(nextGraphLayout('types')).toBe('grid');
    expect(nextGraphLayout('grid')).toBe('flow');
    expect(nextGraphLayout('flow')).toBe('organic');
  });

  it('places a chain left-to-right in Flow and top-to-bottom in Stack', () => {
    const flow = Object.fromEntries(layoutGraph(nodes, edges, 'flow').map((p) => [p.id, p]));
    expect(flow['b'].x).toBeGreaterThan(flow['a'].x);
    expect(flow['c'].x).toBeGreaterThan(flow['b'].x);

    const stack = Object.fromEntries(layoutGraph(nodes, edges, 'stack').map((p) => [p.id, p]));
    expect(stack['b'].y).toBeGreaterThan(stack['a'].y);
    expect(stack['c'].y).toBeGreaterThan(stack['b'].y);
  });

  it('groups Types into columns and Grid into a compact wrap', () => {
    const types = Object.fromEntries(layoutGraph(nodes, edges, 'types').map((p) => [p.id, p]));
    expect(types['a'].x).toBe(types['c'].x);
    expect(types['b'].x).not.toBe(types['a'].x);

    const grid = layoutGraph(nodes, edges, 'grid');
    expect(grid.length).toBe(3);
    expect(new Set(grid.map((p) => p.id)).size).toBe(3);
  });

  it('falls back unknown stored values to Organic', () => {
    expect(parseGraphLayout('nope')).toBe('organic');
    expect(parseGraphLayout(null)).toBe('organic');
    expect(parseGraphLayout('flow')).toBe('flow');
    expect(parseGraphLayout('organic')).toBe('organic');
  });

  it('places every node in Organic without overlapping boxes', () => {
    const placed = layoutGraph(nodes, edges, 'organic');
    expect(placed.map((p) => p.id).sort()).toEqual(['a', 'b', 'c']);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const an = byId.get(a.id)!;
        const bn = byId.get(b.id)!;
        const overlap =
          a.x < b.x + bn.width &&
          a.x + an.width > b.x &&
          a.y < b.y + bn.height &&
          a.y + an.height > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('places deeper Radial nodes farther from the origin than roots', () => {
    const placed = Object.fromEntries(layoutGraph(nodes, edges, 'radial').map((p) => [p.id, p]));
    const center = (id: keyof typeof placed) => {
      const n = nodes.find((node) => node.id === id)!;
      return { x: placed[id].x + n.width / 2, y: placed[id].y + n.height / 2 };
    };
    const root = center('a');
    const dist = (id: 'a' | 'b' | 'c') => {
      const c = center(id);
      return Math.hypot(c.x - root.x, c.y - root.y);
    };
    expect(dist('c')).toBeGreaterThan(dist('a'));
    expect(dist('b')).toBeGreaterThan(dist('a'));
    expect(graphLayoutRouting('radial')).toBe('bezier');
    expect(graphLayoutRouting('organic')).toBe('bezier');
    expect(graphLayoutRouting('stack')).toBe('orthogonal');
  });

  it('connects facing midpoints and uses unused sides before reuse', () => {
    const across = assignEdgePorts(
      [
        { id: 'a', x: 0, y: 0, width: 100, height: 40 },
        { id: 'b', x: 200, y: 0, width: 100, height: 40 },
      ],
      [{ from: 'a', to: 'b' }],
    );
    expect(across[0]).toEqual({ sourcePort: 'right', targetPort: 'left' });

    const down = assignEdgePorts(
      [
        { id: 'a', x: 0, y: 0, width: 100, height: 40 },
        { id: 'b', x: 0, y: 120, width: 100, height: 40 },
      ],
      [{ from: 'a', to: 'b' }],
    );
    expect(down[0]).toEqual({ sourcePort: 'bottom', targetPort: 'top' });

    const hub = assignEdgePorts(
      [
        { id: 'a', x: 200, y: 200, width: 80, height: 80 },
        { id: 'r', x: 400, y: 200, width: 80, height: 80 },
        { id: 'd', x: 200, y: 400, width: 80, height: 80 },
        { id: 'l', x: 0, y: 200, width: 80, height: 80 },
        { id: 'u', x: 200, y: 0, width: 80, height: 80 },
      ],
      [
        { from: 'a', to: 'r' },
        { from: 'a', to: 'd' },
        { from: 'a', to: 'l' },
        { from: 'a', to: 'u' },
      ],
    );
    expect(hub.map((p) => p.sourcePort).sort()).toEqual(['bottom', 'left', 'right', 'top']);
  });

  it('keeps diagonal neighbors on an L-shaped pair so edges do not pile on one side', () => {
    const q = { id: 'q', x: 40, y: 20, width: 220, height: 90 };
    const h = { id: 'h', x: 280, y: 160, width: 240, height: 100 };
    const ev = { id: 'ev', x: 20, y: 220, width: 220, height: 90 };
    const x = { id: 'x', x: 580, y: 80, width: 220, height: 90 };
    const ports = assignEdgePorts([q, h, ev, x], [
      { from: 'q', to: 'h' },
      { from: 'h', to: 'ev' },
      { from: 'h', to: 'x' },
    ]);
    expect(ports[0]).toEqual({ sourcePort: 'right', targetPort: 'top' });
    expect(ports[1]).toEqual({ sourcePort: 'left', targetPort: 'right' });
    expect(ports[2]).toEqual({ sourcePort: 'right', targetPort: 'left' });
  });
});
