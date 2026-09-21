import { Component, SecurityContext, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { renderMarkdown } from './render-markdown';

@Component({
  selector: 'ideate-md',
  template: `<div class="md" [innerHTML]="html()"></div>`,
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
    :host-context(.bubble) .md ul { list-style: disc; }
    :host-context(.bubble) .md ol { list-style: decimal; }
  `,
})
export class MdViewComponent {
  readonly source = input<string | null | undefined>('');
  private readonly sanitizer = inject(DomSanitizer);

  readonly html = computed((): SafeHtml => {
    const raw = this.sanitizer.sanitize(SecurityContext.HTML, renderMarkdown(this.source())) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });
}
