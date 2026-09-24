import { normalizeMermaidSource } from './render-mermaid';

describe('normalizeMermaidSource', () => {
  it('rewrites stateDiagram participant notes as sequenceDiagram', () => {
    const out = normalizeMermaidSource(`stateDiagram-v2
participant Compass
participant Earth
note left of participant Compass: "Exploits Earth's magnetic field"
note above participant Earth: "Has a magnetic field"
`);
    expect(out.startsWith('sequenceDiagram')).toBe(true);
    expect(out).toContain('Note left of Compass: "Exploits Earth\'s magnetic field"');
    expect(out).toContain('Note over Earth: "Has a magnetic field"');
    expect(out).not.toContain('stateDiagram');
    expect(out).not.toContain('participant Compass:');
  });
});
