import { Component, ElementRef, SecurityContext, afterEveryRender, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ThemeService } from '../core/theme/theme.service';
import { renderMarkdown } from './render-markdown';
import { renderMermaidSvg, normalizeMermaidSource } from './render-mermaid';

@Component({
  selector: 'ideate-md',
  template: `<div class="md" [attr.data-mermaid-theme]="dark() ? 'dark' : 'light'" [innerHTML]="html()"></div>`,
  styles: `
    :host { display: block; }
    .md {
      font-size: inherit;
      line-height: 1.45;
      color: inherit;
      overflow-wrap: anywhere;
    }
    .md :is(p, ul, ol, pre) { margin: 0 0 0.5em; }
    .md :is(p, ul, ol, pre):last-child { margin-bottom: 0; }
    .md ul, .md ol { padding-left: 1.2em; }
    .md li { margin: 0.15em 0; }
    .md h1, .md h2, .md h3 {
      margin: 0 0 0.35em;
      font-size: 1em;
      font-weight: 650;
      line-height: 1.3;
    }
    .md code {
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.9em;
    }
    .md pre {
      overflow: auto;
      padding: 0.4rem 0.5rem;
      background: var(--mt-input-bg, color-mix(in srgb, var(--mt-text) 6%, transparent));
      border-radius: var(--mt-panel-border-radius, 2px);
    }
    .md a { color: var(--mt-primary); }
    .md strong { font-weight: 650; }
    .md .mermaid-slot {
      overflow: auto;
      margin: 0 0 0.85em;
      padding: 0.35rem 0.2rem;
    }
    .md .mermaid-slot:last-child { margin-bottom: 0; }
    .md .mermaid-slot svg {
      max-width: 100%;
      height: auto;
    }
    .md .mermaid-fallback {
      margin: 0;
      white-space: pre-wrap;
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.85em;
    }
    :host-context(.bubble) .md ul { list-style: disc; }
    :host-context(.bubble) .md ol { list-style: decimal; }
  `,
})
export class MdViewComponent {
  readonly source = input<string | null | undefined>('');
  readonly diagrams = input(false);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly theme = inject(ThemeService);
  private paintedKey = '';
  private paintGen = 0;
  readonly dark = computed(() => this.theme.dark());

  private readonly parsed = computed(() =>
    renderMarkdown(this.source(), { diagrams: this.diagrams() }),
  );

  readonly html = computed((): SafeHtml => {
    const raw = this.sanitizer.sanitize(SecurityContext.HTML, this.parsed().html) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });

  constructor() {
    afterEveryRender(() => {
      if (!this.diagrams()) {
        return;
      }
      void this.paintSlots();
    });
  }

  private async paintSlots() {
    const diagrams = this.parsed().diagrams;
    const dark = this.dark();
    const key = `${dark}\0${this.source() ?? ''}`;
    const root = this.host.nativeElement.querySelector('.md');
    const slots: HTMLElement[] = root ? (Array.from(root.querySelectorAll('.mermaid-slot')) as HTMLElement[]) : [];
    if (!root || slots.length === 0) {
      return;
    }
    if (key === this.paintedKey) {
      return;
    }
    this.paintedKey = key;
    const gen = ++this.paintGen;
    for (let i = 0; i < slots.length; i++) {
      const source = diagrams[i];
      const slot = slots[i];
      if (!source) {
        continue;
      }
      const toRender =
        /stateDiagram/i.test(source) && /\bparticipant\b/i.test(source)
          ? normalizeMermaidSource(source)
          : source;
      try {
        const svg = await renderMermaidSvg(toRender, dark);
        if (gen !== this.paintGen) {
          return;
        }
        slot.innerHTML = svg;
      } catch {
        try {
          const svg = await renderMermaidSvg(normalizeMermaidSource(source), dark);
          if (gen !== this.paintGen) {
            return;
          }
          slot.innerHTML = svg;
        } catch {
          if (gen !== this.paintGen) {
            return;
          }
          slot.innerHTML = '';
          const fallback = document.createElement('pre');
          fallback.className = 'mermaid-fallback';
          fallback.textContent = '```mermaid\n' + source + '\n```';
          slot.appendChild(fallback);
        }
      }
      document.querySelectorAll('body > svg, body > div').forEach((el) => {
        if (/syntax error in text mermaid/i.test(el.textContent || '')) {
          el.remove();
        }
      });
    }
  }
}
