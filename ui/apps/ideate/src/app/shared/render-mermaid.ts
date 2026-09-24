let mermaidMod: typeof import('mermaid') | null = null;
let seq = 0;

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
