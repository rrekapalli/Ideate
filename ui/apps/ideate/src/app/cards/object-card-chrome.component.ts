import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IdeaObject, OBJECT_TYPES } from '@ideate/api-client';
import { MtButtonComponent, MtTagComponent } from '@ideate/ui';
import { cardBox } from './card-layout';
import { DiagramCanvasBridge } from './diagram-canvas-bridge';

@Component({
  selector: 'ideate-object-card-chrome',
  imports: [FormsModule, MtButtonComponent, MtTagComponent],
  template: `
    <article
      class="card"
      [class.expanded]="expanded()"
      [attr.data-category]="object().objectCategory"
      [attr.data-type]="object().type"
      [style.width.px]="box().width"
      title="Double-click to open the full page"
      (dblclick)="emitOpen()"
    >
      <header (click)="$event.stopPropagation()">
        <span class="id">{{ object().displayId }}</span>
        <select [ngModel]="object().type" (ngModelChange)="emitType($event)">
          @for (t of types; track t) {
            <option [value]="t">{{ t }}</option>
          }
        </select>
        <span class="ver">v{{ object().version }}</span>
        <mt-button size="sm" variant="text" [label]="'+'" (clicked)="emitNew()" />
        <mt-button size="sm" variant="text" [label]="'⋯'" (clicked)="emitMenu()" />
      </header>
      <h3>{{ object().title }}</h3>
      <p class="summary">{{ object().summary || 'No summary yet.' }}</p>
      @if (hasBody()) {
        <button type="button" class="acc" (click)="$event.stopPropagation(); toggle()">
          {{ expanded() ? 'Hide reply' : 'Show reply' }}
        </button>
        @if (expanded()) {
          <div class="body">{{ object().body }}</div>
        }
      }
      <footer>
        @for (tag of object().tags; track tag) {
          <mt-tag [value]="tag" />
        }
        @if (object().sourceUserMessageId) {
          <button type="button" class="chatref" (click)="$event.stopPropagation(); emitChat()">💬</button>
        }
      </footer>
    </article>
  `,
  styles: `
    .card {
      box-sizing: border-box;
      min-width: 220px;
      background: var(--mt-surface-card);
      border: 1px solid var(--mt-surface-border);
      border-left: 3px solid var(--mt-primary);
      padding: 0.5rem 0.55rem 0.45rem;
      cursor: pointer;
      color: var(--mt-text);
    }
    .card[data-category='abandoned'] { border-left-color: #9ca3af; opacity: 0.85; }
    .card[data-category='misconception'] { border-left-color: #f59e0b; }
    .card[data-category='unknown'] { border-left-color: #6366f1; }
    .card[data-category='speculative'] { border-left-color: #22d3ee; }
    .card[data-category='supported'] { border-left-color: #34d399; }
    .card[data-type='question'] { border-left-color: #2563eb; }
    .card[data-type='concept'] { border-left-color: #7c3aed; }
    .card[data-type='hypothesis'] { border-left-color: #0d9488; }
    .card[data-type='evidence'] { border-left-color: #16a34a; }
    .card[data-type='experiment'] { border-left-color: #ca8a04; }
    header { display: flex; gap: 0.25rem; align-items: center; }
    .id { font-family: var(--font-family-mono, monospace); font-size: 0.75rem; }
    select { background: transparent; color: inherit; border: 0; max-width: 7.5rem; }
    h3 { margin: 0.35rem 0 0.2rem; font-size: 0.95rem; line-height: 1.25; }
    .summary { margin: 0; font-size: 0.8rem; color: var(--mt-text-muted); line-height: 1.35; }
    .acc {
      margin-top: 0.4rem;
      padding: 0;
      border: 0;
      background: none;
      color: var(--mt-primary);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 650;
      cursor: pointer;
    }
    .body {
      margin-top: 0.35rem;
      max-height: 16rem;
      overflow: auto;
      white-space: pre-wrap;
      font-size: 0.78rem;
      line-height: 1.4;
      color: var(--mt-text);
    }
    footer { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.4rem; align-items: center; }
    .chatref { background: none; border: 0; cursor: pointer; }
    .ver { font-size: 0.7rem; color: var(--mt-text-muted); }
  `,
})
export class ObjectCardChromeComponent {
  private readonly bridge = inject(DiagramCanvasBridge, { optional: true });
  readonly object = input.required<IdeaObject>();
  readonly types = OBJECT_TYPES;
  readonly expanded = signal(false);
  readonly open = output<IdeaObject>();
  readonly typeChange = output<string>();
  readonly newNode = output<IdeaObject>();
  readonly menu = output<IdeaObject>();
  readonly openChat = output<IdeaObject>();

  box() {
    return cardBox(this.object(), this.expanded());
  }

  hasBody(): boolean {
    return !!(this.object().body && this.object().body.trim());
  }

  toggle() {
    this.expanded.update((v) => !v);
  }

  emitOpen() {
    this.open.emit(this.object());
    this.bridge?.open$.next(this.object());
  }

  emitType(type: string) {
    this.typeChange.emit(type);
    this.bridge?.typeChange$.next({ object: this.object(), type });
  }

  emitNew() {
    this.newNode.emit(this.object());
    this.bridge?.newNode$.next(this.object());
  }

  emitMenu() {
    this.menu.emit(this.object());
    this.bridge?.menu$.next(this.object());
  }

  emitChat() {
    this.openChat.emit(this.object());
    this.bridge?.openChat$.next(this.object());
  }
}
