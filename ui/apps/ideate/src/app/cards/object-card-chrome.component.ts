import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IdeaObject, OBJECT_TYPES } from '@ideate/api-client';
import { MtButtonComponent, MtTagComponent } from '@ideate/ui';
import { MdViewComponent } from '../shared/md-view.component';
import { cardBox } from './card-layout';
import { DiagramCanvasBridge } from './diagram-canvas-bridge';

@Component({
  selector: 'ideate-object-card-chrome',
  imports: [FormsModule, MtButtonComponent, MtTagComponent, MdViewComponent],
  template: `
    <article
      class="card"
      [class.expanded]="expanded()"
      [attr.data-category]="object().objectCategory"
      [attr.data-type]="object().type"
      [style.width.px]="box().width"
      title="Double-tap or double-click to open the full page"
      (pointerup)="onCardPointerUp($event)"
      (click)="onCardActivate($event)"
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
      <div class="summary"><ideate-md [source]="object().summary || 'No summary yet.'" /></div>
      <footer>
        <button type="button" class="chatref" (click)="$event.stopPropagation(); emitChat()" aria-label="Chat">💬</button>
        <span class="tags">
          @for (tag of object().tags; track tag) {
            <mt-tag [value]="tag" />
          }
        </span>
        @if (hasBody()) {
          <button type="button" class="acc" (click)="$event.stopPropagation(); toggle()">
            {{ expanded() ? 'Hide reply' : 'Show reply' }}
          </button>
        }
      </footer>
      @if (hasBody() && expanded()) {
        <div class="body"><ideate-md [source]="object().body" /></div>
      }
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
      touch-action: manipulation;
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
      margin: 0 0 0 auto;
      padding: 0;
      border: 0;
      background: none;
      color: var(--mt-primary);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 650;
      cursor: pointer;
      white-space: nowrap;
    }
    .body {
      margin-top: 0.35rem;
      max-height: 16rem;
      overflow: auto;
      font-size: 0.78rem;
      line-height: 1.4;
      color: var(--mt-text);
    }
    footer {
      display: flex;
      gap: 0.35rem;
      margin-top: 0.45rem;
      align-items: center;
    }
    .chatref {
      flex: 0 0 auto;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      font-size: 0.95rem;
      line-height: 1;
    }
    .tags { display: flex; gap: 0.25rem; flex-wrap: wrap; min-width: 0; flex: 1 1 auto; }
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

  onCardPointerUp(ev: PointerEvent) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) {
      return;
    }
    if (this.isChromeControl(ev.target)) {
      return;
    }
    this.countedAt = performance.now();
    this.noteTap(ev.clientX, ev.clientY);
  }

  onCardActivate(ev: Event) {
    if (this.isChromeControl(ev.target)) {
      return;
    }
    if (performance.now() - this.countedAt < 80) {
      return;
    }
    const point = ev instanceof MouseEvent ? ev : null;
    this.noteTap(point?.clientX ?? this.lastTapX, point?.clientY ?? this.lastTapY);
  }

  emitOpen() {
    const now = performance.now();
    if (now - this.openedAt < 400) {
      return;
    }
    this.openedAt = now;
    this.lastTapAt = 0;
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

  private lastTapAt = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private countedAt = 0;
  private openedAt = 0;

  private isChromeControl(target: EventTarget | null): boolean {
    return target instanceof Element && !!target.closest('button, select, a, input, textarea, label');
  }

  private noteTap(x: number, y: number): boolean {
    const now = performance.now();
    const dt = now - this.lastTapAt;
    const dist = Math.hypot(x - this.lastTapX, y - this.lastTapY);
    this.lastTapAt = now;
    this.lastTapX = x;
    this.lastTapY = y;
    if (dt > 0 && dt < 450 && dist < 32) {
      this.emitOpen();
      return true;
    }
    return false;
  }
}
