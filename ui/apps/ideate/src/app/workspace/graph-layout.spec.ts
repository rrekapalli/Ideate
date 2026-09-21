import { layoutGraph, nextGraphLayout, parseGraphLayout } from './graph-layout';

const nodes = [
  { id: 'a', width: 100, height: 40, type: 'question' },
  { id: 'b', width: 100, height: 40, type: 'hypothesis' },
  { id: 'c', width: 100, height: 40, type: 'question' },
];
const edges = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }];

describe('graph-layout', () => {
  it('cycles Stack → Types → Grid → Flow → Stack', () => {
    expect(nextGraphLayout('stack')).toBe('types');
    expect(nextGraphLayout('types')).toBe('grid');
    expect(nextGraphLayout('grid')).toBe('flow');
    expect(nextGraphLayout('flow')).toBe('stack');
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

  it('falls back unknown stored values to Stack', () => {
    expect(parseGraphLayout('nope')).toBe('stack');
    expect(parseGraphLayout(null)).toBe('stack');
    expect(parseGraphLayout('flow')).toBe('flow');
  });
});
