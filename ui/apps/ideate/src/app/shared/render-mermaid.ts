let mermaidMod: typeof import('mermaid') | null = null;
let seq = 0;

const DIAGRAM_HEADER = /^(sequenceDiagram|stateDiagram(?:-v2)?|flowchart(?:\s+\w+)?|graph(?:\s+\w+)?)\s*$/i;

export function normalizeMermaidSource(source: string): string {
  let s = (source ?? '').replace(/\r\n/g, '\n').trim();
  s = s.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/i, '').trim();
  if (!s) {
    return s;
  }
  const lines = s.split('\n');
  const dropHeader = DIAGRAM_HEADER.test(lines[0].trim());
  const body = (dropHeader ? lines.slice(1) : lines).join('\n');
  const mixed = dropHeader ? s : `x\n${s}`;
  const usesParticipants = /\bparticipant\b/i.test(mixed) || /\bnote\s+(left|right|over|above|below)\b/i.test(mixed);
  if (usesParticipants) {
    return (
      'sequenceDiagram\n' +
      body
        .replace(/\bnote\s+left\s+of\s+(?:participant\s+)?(\w+)\s*:/gi, 'Note left of $1:')
        .replace(/\bnote\s+right\s+of\s+(?:participant\s+)?(\w+)\s*:/gi, 'Note right of $1:')
        .replace(/\bnote\s+(?:above|below|over)\s+(?:participant\s+)?(\w+)\s*:/gi, 'Note over $1:')
        .replace(/(Note (?:left of|right of|over) \w+:)\s*"?([^"\n]*?)"?\s*$/gim, '$1 "$2"')
    ).trim();
  }
  if (/\[\*\]/.test(s) || /\bstate\s+\w+/i.test(s)) {
    return (dropHeader && /^stateDiagram/i.test(lines[0].trim()) ? s : `stateDiagram-v2\n${body}`).trim();
  }
  if (/\bflowchart\b|\bgraph\s+(TD|LR|TB|RL)\b/i.test(s) || /-->/.test(s)) {
    return (dropHeader ? s : `flowchart TD\n${body}`).trim();
  }
  return s;
}

export async function renderMermaidSvg(source: string, dark: boolean): Promise<string> {
  if (!mermaidMod) {
    mermaidMod = await import('mermaid');
  }
  const mermaid = mermaidMod.default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: dark ? 'dark' : 'default',
  });
  const id = `ideateMermaid${++seq}`;
  const { svg } = await mermaid.render(id, source);
  return svg;
}

export async function svgToPngDataUrl(svg: string): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('svg image failed'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    const w = Math.max(1, img.naturalWidth || img.width || 640);
    const h = Math.max(1, img.naturalHeight || img.height || 360);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('canvas');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
