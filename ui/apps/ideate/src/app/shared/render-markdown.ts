/** Compact Markdown → HTML. Escape first so only the tags we add are markup. */
export function renderMarkdown(source: string | null | undefined): string {
  const raw = (source ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) {
    return '';
  }
  const fences: string[] = [];
  let text = escapeHtml(raw).replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (_m, code: string) => {
    const i = fences.length;
    fences.push(`<pre><code>${code.replace(/^\n|\n$/g, '')}</code></pre>`);
    return `\u0000F${i}\u0000`;
  });
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  const html = text
    .split(/\n{2,}/)
    .map((block) => renderBlock(block))
    .join('');
  return html.replace(/\u0000F(\d+)\u0000/g, (_m, i: string) => fences[Number(i)] ?? '');
}

function renderBlock(block: string): string {
  const lines = block.split('\n').filter((l, i, a) => !(l === '' && (i === 0 || i === a.length - 1)));
  if (lines.length === 0) {
    return '';
  }
  const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
  if (heading && lines.length === 1) {
    const n = heading[1].length;
    return `<h${n}>${heading[2]}</h${n}>`;
  }
  if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
    return `<ul>${lines.map((l) => `<li>${l.replace(/^\s*[-*]\s+/, '')}</li>`).join('')}</ul>`;
  }
  if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
    return `<ol>${lines.map((l) => `<li>${l.replace(/^\s*\d+\.\s+/, '')}</li>`).join('')}</ol>`;
  }
  return `<p>${lines.join('<br>')}</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
