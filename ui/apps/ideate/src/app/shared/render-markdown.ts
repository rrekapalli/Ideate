/** Compact Markdown → HTML. Escape first so only the tags we add are markup. */

export type MarkdownDocument = {
  html: string;
  diagrams: string[];
};

const FENCE_RE = /`{3,}([a-zA-Z0-9_-]*)[ \t]*\r?\n?([\s\S]*?)`{3,}/g;

export function hasMermaidFence(source: string | null | undefined): boolean {
  return /```mermaid\b/i.test(source ?? '');
}

export function renderMarkdown(
  source: string | null | undefined,
  options?: { diagrams?: boolean },
): MarkdownDocument {
  const raw = (source ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) {
    return { html: '', diagrams: [] };
  }
  const showDiagrams = options?.diagrams === true;
  const diagrams: string[] = [];
  const fences: string[] = [];
  let text = raw.replace(FENCE_RE, (_m, lang: string, code: string) => {
    const body = code.replace(/^\n+|\n+$/g, '');
    const i = fences.length;
    const mermaid = (lang || '').toLowerCase() === 'mermaid';
    if (mermaid && showDiagrams) {
      const d = diagrams.length;
      diagrams.push(body);
      fences.push(`<div class="mermaid-slot" data-diagram="${d}"></div>`);
    } else {
      fences.push(`<pre><code>${escapeHtml(body)}</code></pre>`);
    }
    return `\u0000F${i}\u0000`;
  });
  text = escapeHtml(text);
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
  return {
    html: html.replace(/\u0000F(\d+)\u0000/g, (_m, i: string) => fences[Number(i)] ?? ''),
    diagrams,
  };
}

function renderBlock(block: string): string {
  const lines = block.split('\n').filter((l, i, a) => !(l === '' && (i === 0 || i === a.length - 1)));
  if (lines.length === 0) {
    return '';
  }
  const heading = lines[0].match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const n = heading[1].length;
    const rest = lines.slice(1);
    return `<h${n}>${heading[2]}</h${n}>` + (rest.length ? renderBlock(rest.join('\n')) : '');
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
