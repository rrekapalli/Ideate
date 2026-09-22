import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IdeaObject, OBJECT_TYPES, lookupLabel } from '@ideate/api-client';
import { MtButtonComponent, MtIconComponent, MtTagComponent } from '@ideate/ui';
import { MdViewComponent } from '../shared/md-view.component';
import { TypeGlyphComponent } from '../shared/type-glyph.component';
import { cardBox } from './card-layout';
import { DiagramCanvasBridge } from './diagram-canvas-bridge';

@Component({
  selector: 'ideate-object-card-chrome',
  imports: [FormsModule, MtButtonComponent, MtIconComponent, MtTagComponent, MdViewComponent, TypeGlyphComponent],
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
        <div class="hdr-left">
          <ideate-type-glyph [type]="object().type" [size]="14" />
          <span class="id">{{ object().displayId }}</span>
          <select [ngModel]="object().type" (ngModelChange)="emitType($event)" [attr.aria-label]="'Type'">
            @for (t of types; track t) {
              <option [value]="t">{{ lookupLabel(t) }}</option>
            }
          </select>
        </div>
        <div class="hdr-actions">
          <span class="ver">v{{ object().version }}</span>
          <mt-button size="sm" variant="icon" icon="add" ariaLabel="Add related" (clicked)="emitNew()" />
          <mt-button size="sm" variant="icon" icon="recycle_bin" ariaLabel="Delete" (clicked)="emitMenu()" />
        </div>
      </header>
      <h3>{{ object().title }}</h3>
      <div class="summary"><ideate-md [source]="object().summary || 'No summary yet.'" /></div>
      <footer>
        <button type="button" class="chatref" (click)="$event.stopPropagation(); emitChat()" aria-label="Chat">
          <mt-icon name="chat" [size]="14" />
        </button>
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
    .card[data-category='abandoned'] { border-left-color: var(--surface-400, #9ca3af); opacity: 0.85; }
    .card[data-category='misconception'] { border-left-color: var(--ideate-type-misconception); }
    .card[data-category='unknown'] { border-left-color: var(--ideate-type-unknown); }
    .card[data-category='speculative'] { border-left-color: var(--ideate-type-assumption); }
    .card[data-category='supported'] { border-left-color: var(--ideate-type-evidence); }
    .card[data-type='thought'] { border-left-color: var(--ideate-type-thought); }
    .card[data-type='concept'] { border-left-color: var(--ideate-type-concept); }
    .card[data-type='unknown'] { border-left-color: var(--ideate-type-unknown); }
    .card[data-type='question'] { border-left-color: var(--ideate-type-question); }
    .card[data-type='hypothesis'] { border-left-color: var(--ideate-type-hypothesis); }
    .card[data-type='assumption'] { border-left-color: var(--ideate-type-assumption); }
    .card[data-type='evidence'] { border-left-color: var(--ideate-type-evidence); }
    .card[data-type='experiment'] { border-left-color: var(--ideate-type-experiment); }
    .card[data-type='observation'] { border-left-color: var(--ideate-type-observation); }
    .card[data-type='claim'] { border-left-color: var(--ideate-type-claim); }
    .card[data-type='critique'] { border-left-color: var(--ideate-type-critique); }
    .card[data-type='decision'] { border-left-color: var(--ideate-type-decision); }
    .card[data-type='evaluation'] { border-left-color: var(--ideate-type-evaluation); }
    .card[data-type='theory'] { border-left-color: var(--ideate-type-theory); }
    .card[data-type='misconception'] { border-left-color: var(--ideate-type-misconception); }
    .card[data-type='constraint'] { border-left-color: var(--ideate-type-constraint); }
    .card[data-type='calculation'] { border-left-color: var(--ideate-type-calculation); }
    .card[data-type='target'] { border-left-color: var(--ideate-type-target); }
    .card[data-type='design_artifact'] { border-left-color: var(--ideate-type-design_artifact); }
    .card[data-type='architecture'] { border-left-color: var(--ideate-type-architecture); }
    .card[data-type='component'] { border-left-color: var(--ideate-type-component); }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
      min-height: 1.6rem;
      padding-bottom: 0.3rem;
      border-bottom: 1px dotted var(--mt-surface-border, var(--surface-border));
    }
    .hdr-left {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.35rem;
      min-width: 0;
      flex: 1 1 auto;
      text-align: left;
    }
    .hdr-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.05rem;
      flex: 0 0 auto;
      margin-left: auto;
    }
    .id {
      font-family: var(--font-family-mono, monospace);
      font-size: 0.75rem;
      line-height: 1;
      text-align: left;
    }
    select {
      background: transparent;
      color: inherit;
      border: 0;
      max-width: 8.5rem;
      min-width: 0;
      height: 1.45rem;
      padding: 0;
      margin: 0;
      line-height: 1.45rem;
      text-align: left;
      text-align-last: left;
      font: inherit;
      font-size: 0.75rem;
    }
    header :is(mt-button) { display: inline-flex; align-items: center; }
    h3 { margin: 0.4rem 0 0.2rem; font-size: 0.95rem; line-height: 1.25; }
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
      padding-top: 0.35rem;
      align-items: center;
      border-top: 1px dotted var(--mt-surface-border, var(--surface-border));
    }
    .chatref {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      color: var(--mt-primary, currentColor);
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
  readonly lookupLabel = lookupLabel;
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
