import { layoutGraph } from './graph-layout';

describe('layoutGraph', () => {
  it('places targets to the right of sources so out→in ports can run left-to-right', () => {
    const pos = layoutGraph(
      [
        { id: 'q', width: 200, height: 120 },
        { id: 'h', width: 200, height: 120 },
        { id: 'x', width: 200, height: 120 },
        { id: 'k', width: 200, height: 120 },
      ],
      [
        { from: 'q', to: 'h' },
        { from: 'k', to: 'h' },
        { from: 'h', to: 'x' },
      ],
    );
    const byId = Object.fromEntries(pos.map((p) => [p.id, p]));
    expect(byId['q'].x).toBeLessThan(byId['h'].x);
    expect(byId['k'].x).toBe(byId['q'].x);
    expect(byId['h'].x).toBeLessThan(byId['x'].x);
    expect(byId['q'].y).not.toBe(byId['k'].y);
  });
});
