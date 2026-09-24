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
