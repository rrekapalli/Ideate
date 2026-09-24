import { hasMermaidFence, renderMarkdown } from './render-markdown';

describe('renderMarkdown', () => {
  it('formats bold, lists, and paragraphs without leaking HTML', () => {
    const { html } = renderMarkdown(
      'Ice is **less dense** than water.\n\n- open crystal\n- same mass, more space\n\n<script>x</script>',
    );
    expect(html).toContain('<strong>less dense</strong>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>open crystal</li>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('keeps mermaid source as a code fence when diagrams are off', () => {
    const { html, diagrams } = renderMarkdown(
      'See the flow.\n\n```mermaid\nflowchart TD\n  A["a < b"] --> B\n```',
    );
    expect(diagrams).toEqual([]);
    expect(html).toContain('<pre><code>');
    expect(html).toContain('a &lt; b');
    expect(html).not.toContain('mermaid-slot');
    expect(html).not.toContain('a < b');
  });

  it('extracts raw mermaid source into slots when diagrams are on', () => {
    const { html, diagrams } = renderMarkdown(
      'See the flow.\n\n```mermaid\nflowchart TD\n  A["a < b"] --> B\n```\n\nDone.',
      { diagrams: true },
    );
    expect(diagrams).toEqual(['flowchart TD\n  A["a < b"] --> B']);
    expect(html).toContain('<div class="mermaid-slot" data-diagram="0"></div>');
    expect(html).not.toContain('a < b');
    expect(html).toContain('See the flow');
    expect(hasMermaidFence('```mermaid\nflowchart TD\n  A --> B\n```')).toBe(true);
  });
});
