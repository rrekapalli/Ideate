import { renderMarkdown } from './render-markdown';

describe('renderMarkdown', () => {
  it('formats bold, lists, and paragraphs without leaking HTML', () => {
    const html = renderMarkdown('Ice is **less dense** than water.\n\n- open crystal\n- same mass, more space\n\n<script>x</script>');
    expect(html).toContain('<strong>less dense</strong>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>open crystal</li>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
