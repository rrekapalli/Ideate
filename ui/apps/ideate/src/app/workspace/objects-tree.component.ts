import { Component, computed, input, output, signal } from '@angular/core';
import { IdeaObject, lookupLabel, personaIcon } from '@ideate/api-client';
import { MtIconComponent, MtTooltipDirective } from '@ideate/ui';
import { MdViewComponent } from '../shared/md-view.component';
import { TypeGlyphComponent } from '../shared/type-glyph.component';
import {
  INVENTOR_PROMOTED_TYPES,
  STUDENT_PROMOTED_TYPES,
  isInventorPersona,
  isStudentPersona,
  typePluralDisplayLabel,
} from '../persona/persona-lens';

type TreeRow =
  | { kind: 'root'; id: 'workspace'; depth: 0 }
  | { kind: 'type'; id: string; type: string; label: string; count: number; depth: 1 }
  | { kind: 'item'; id: string; object: IdeaObject; depth: 2 };

@Component({
  selector: 'ideate-objects-tree',
  imports: [MtIconComponent, MtTooltipDirective, MdViewComponent, TypeGlyphComponent],
  template: `
    <div class="docs-header">
      <div class="docs-toolbar" role="toolbar" aria-label="Object views">
        <button type="button" class="view-btn" [class.on]="view() === 'tree'" mtTooltip="Tree" aria-label="Tree" [attr.aria-pressed]="view() === 'tree'" (click)="view.set('tree')">
          <mt-icon name="sitemap" [size]="14" />
        </button>
        <button type="button" class="view-btn" [class.on]="view() === 'timeline'" mtTooltip="Timeline" aria-label="Timeline" [attr.aria-pressed]="view() === 'timeline'" (click)="view.set('timeline')">
          <mt-icon name="history" [size]="14" />
        </button>
      </div>
    </div>
    @if (view() === 'tree') {
    <div class="tree" role="tree" aria-label="Workspace objects">
      @for (row of visibleRows(); track row.kind + ':' + row.id) {
        @if (row.kind === 'root') {
          <button type="button" class="row root" role="treeitem" [attr.aria-expanded]="isOpen('workspace')" (click)="toggle('workspace')">
            <span class="twist">
              <mt-icon [name]="isOpen('workspace') ? 'expand_more' : 'chevron_right'" [size]="14" />
            </span>
            <mt-icon
              [name]="personaIcon(persona())"
              [size]="14"
              class="root-icon"
              [style.color]="persona() ? 'var(--ideate-persona-' + persona() + ')' : null"
            />
            <span class="root-meta">
              <span class="name strong">{{ name() || 'Workspace' }}</span>
              @if (persona() || kind()) {
                <span class="root-sub">{{ lookupLabel(kind() || 'workspace') }} · {{ lookupLabel(persona()) }}</span>
              }
            </span>
          </button>
        } @else if (row.kind === 'type') {
          <button type="button" class="row branch" role="treeitem" [attr.aria-expanded]="isOpen(row.id)" (click)="toggle(row.id)">
            <span class="twist">
              <mt-icon [name]="isOpen(row.id) ? 'expand_more' : 'chevron_right'" [size]="14" />
            </span>
            <ideate-type-glyph [type]="row.type" [size]="14" />
            <span class="name strong">{{ row.label }} - ({{ row.count }})</span>
          </button>
        } @else {
          <button
            type="button"
            class="row item"
            role="treeitem"
            [class.active]="activeId() === row.object.id"
            (click)="activate.emit(row.object)"
            (dblclick)="openPage.emit(row.object)"
          >
            <span class="twist"></span>
            <ideate-type-glyph [type]="row.object.type" [size]="12" />
            <span class="item-text">
              <span class="id">{{ row.object.displayId }}</span>
              <span class="name">{{ row.object.title }}</span>
            </span>
          </button>
        }
      }
      @if (groups().length === 0) {
        <p class="muted">Empty graph. Talk in Chat or use + New Thought.</p>
      }
    </div>
    } @else {
      <div class="timeline-pane">
        @if (timelineNodes().length === 0) {
          <p class="muted">Objects appear here as they are created.</p>
        } @else {
          <ol class="node-timeline">
            @for (n of timelineNodes(); track n.id) {
              <li>
                <button
                  type="button"
                  class="node-card"
                  [class.active]="activeId() === n.id"
                  [attr.data-type]="n.type"
                  [attr.data-category]="n.objectCategory"
                  (click)="activate.emit(n)"
                  (dblclick)="openPage.emit(n)"
                >
                  <time [attr.datetime]="n.createdAt">{{ when(n.createdAt) }}</time>
                  <span class="node-card-head">
                    <ideate-type-glyph [type]="n.type" [size]="12" />
                    <span class="id">{{ n.displayId }}</span>
                    <span class="kind">{{ lookupLabel(n.type) }}</span>
                    <span class="ver">v{{ n.version }}</span>
                  </span>
                  <span class="node-card-title">{{ n.title }}</span>
                  <span class="node-card-summary">
                    <ideate-md [source]="n.summary || 'No summary yet.'" />
                  </span>
                </button>
              </li>
            }
          </ol>
        }
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .docs-header { flex: none; border-bottom: 1px solid var(--surface-border); padding: 0.2rem 0.35rem; }
    .docs-toolbar { display: flex; flex-wrap: nowrap; align-items: center; gap: 0.1rem; min-height: 1.75rem; }
    .view-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      border: 0;
      border-radius: var(--mt-panel-border-radius, 1px);
      background: transparent;
      color: var(--text-color-secondary, var(--mt-text-muted));
      cursor: pointer;
    }
    .view-btn:hover { background: var(--surface-hover); color: var(--primary-color); }
    .view-btn.on { background: var(--primary-color); color: #fff; }
    .tree, .timeline-pane { flex: 1; min-height: 0; overflow: auto; }
    .tree { padding: 0.3rem 0 0.6rem; }
    .node-timeline { list-style: none; margin: 0; padding: 0.35rem 0.45rem 0.5rem 0.35rem; display: flex; flex-direction: column; }
    .node-timeline li { position: relative; margin: 0; padding: 0 0 0.5rem 0.85rem; }
    .node-timeline li::before {
      content: '';
      position: absolute;
      left: 0.18rem;
      top: 0.55rem;
      bottom: -0.1rem;
      width: 1px;
      background: var(--surface-border, var(--mt-surface-border));
    }
    .node-timeline li:last-child::before { display: none; }
    .node-timeline li::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0.42rem;
      width: 0.38rem;
      height: 0.38rem;
      border-radius: 50%;
      background: var(--mt-primary, var(--primary-color));
      box-shadow: 0 0 0 2px var(--mt-surface-card, #fff);
    }
    .node-card {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0.12rem;
      width: 100%;
      text-align: left;
      cursor: pointer;
      color: var(--mt-text);
      background: var(--mt-surface-card);
      border: 1px solid var(--mt-surface-border, var(--surface-border));
      border-left: 3px solid var(--mt-primary);
      border-radius: var(--mt-panel-border-radius, 1px);
      padding: 0.32rem 0.4rem 0.38rem;
    }
    .node-card[data-type='thought'] { border-left-color: var(--ideate-type-thought); }
    .node-card[data-type='concept'] { border-left-color: var(--ideate-type-concept); }
    .node-card[data-type='question'] { border-left-color: var(--ideate-type-question); }
    .node-card[data-type='hypothesis'] { border-left-color: var(--ideate-type-hypothesis); }
    .node-card[data-type='assumption'] { border-left-color: var(--ideate-type-assumption); }
    .node-card[data-type='evidence'] { border-left-color: var(--ideate-type-evidence); }
    .node-card[data-type='experiment'] { border-left-color: var(--ideate-type-experiment); }
    .node-card[data-type='observation'] { border-left-color: var(--ideate-type-observation); }
    .node-card[data-type='claim'] { border-left-color: var(--ideate-type-claim); }
    .node-card[data-type='critique'] { border-left-color: var(--ideate-type-critique); }
    .node-card[data-type='decision'] { border-left-color: var(--ideate-type-decision); }
    .node-card[data-type='evaluation'] { border-left-color: var(--ideate-type-evaluation); }
    .node-card[data-type='theory'] { border-left-color: var(--ideate-type-theory); }
    .node-card[data-type='misconception'] { border-left-color: var(--ideate-type-misconception); }
    .node-card[data-type='constraint'] { border-left-color: var(--ideate-type-constraint); }
    .node-card[data-type='calculation'] { border-left-color: var(--ideate-type-calculation); }
    .node-card[data-type='target'] { border-left-color: var(--ideate-type-target); }
    .node-card[data-type='design_artifact'] { border-left-color: var(--ideate-type-design_artifact); }
    .node-card[data-type='architecture'] { border-left-color: var(--ideate-type-architecture); }
    .node-card[data-type='component'] { border-left-color: var(--ideate-type-component); }
    .node-card[data-type='citation'] { border-left-color: var(--ideate-type-citation); }
    .node-card[data-type='unknown'] { border-left-color: var(--ideate-type-unknown); }
    .node-card:hover { background: var(--surface-hover); }
    .node-card.active { box-shadow: inset 0 0 0 1px var(--mt-selection-border, var(--primary-color)); }
    .node-card time { font-size: 0.68rem; color: var(--mt-text-muted); line-height: 1.2; }
    .node-card-head { display: flex; align-items: center; gap: 0.28rem; min-width: 0; font-size: 0.7rem; line-height: 1.2; }
    .node-card-head .kind { color: var(--mt-text-muted); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .node-card-head .ver { margin-left: auto; color: var(--mt-text-muted); flex: 0 0 auto; }
    .node-card-title { font-size: 0.82rem; font-weight: 650; line-height: 1.25; }
    .node-card-summary { font-size: 0.72rem; line-height: 1.3; color: var(--mt-text-muted); }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 0.28rem;
      width: 100%;
      min-height: 1.65rem;
      padding: 0.2rem 0.4rem 0.2rem 0.35rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      box-sizing: border-box;
      cursor: pointer;
    }
    .twist, ideate-type-glyph, .root-icon { margin-top: 0.12rem; }
    .root:hover, .branch:hover { background: var(--surface-hover); }
    .branch { padding-left: 1.15rem; align-items: center; }
    .branch .twist, .branch ideate-type-glyph { margin-top: 0; }
    .item { padding-left: 2.05rem; cursor: pointer; border-radius: var(--mt-panel-border-radius, 1px); }
    .item:hover { background: var(--surface-hover); }
    .item.active {
      background: var(--mt-sidebar-list-selected-bg, var(--mt-selection-bg));
      color: var(--mt-primary, var(--primary-color));
      font-weight: 650;
      box-shadow: inset 3px 0 0 var(--mt-selection-border, var(--primary-color));
    }
    .twist {
      width: 1rem;
      height: 1rem;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      flex: 0 0 1rem;
    }
    .root-meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.05rem;
    }
    .root-sub {
      font-size: 0.68rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: var(--mt-text-muted);
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .item-text {
      min-width: 0;
      flex: 1 1 auto;
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.3;
    }
    .name {
      min-width: 0;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .name.strong { font-weight: 650; font-size: 0.78rem; letter-spacing: 0.02em; }
    .id {
      display: inline;
      margin-right: 0.3rem;
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--mt-primary, #10b981);
    }
    .root-icon { color: var(--mt-primary, #10b981); }
    .muted { margin: 0.5rem 0.7rem; font-size: 0.75rem; color: var(--mt-text-muted); }
  `,
})
export class ObjectsTreeComponent {
  readonly nodes = input.required<IdeaObject[]>();
  readonly name = input('');
  readonly persona = input('');
  readonly kind = input('workspace');
  readonly activeId = input<string | null>(null);
  readonly lookupLabel = lookupLabel;
  readonly personaIcon = personaIcon;
  readonly activate = output<IdeaObject>();
  readonly openPage = output<IdeaObject>();

  readonly view = signal<'tree' | 'timeline'>('tree');
  readonly collapsed = signal(new Set<string>());

  readonly timelineNodes = computed(() =>
    [...this.nodes()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.displayId.localeCompare(b.displayId)),
  );

  when(raw?: string): string {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  readonly groups = computed(() => {
    const map = new Map<string, IdeaObject[]>();
    for (const n of this.nodes()) {
      const list = map.get(n.type) ?? [];
      list.push(n);
      map.set(n.type, list);
    }
    const persona = this.persona();
    const entries = [...map.entries()].map(([type, items]) => ({
      type,
      id: 'type:' + type,
      label: typePluralDisplayLabel(persona, type),
      items,
    }));
    const promoted = isStudentPersona(persona)
      ? STUDENT_PROMOTED_TYPES
      : isInventorPersona(persona)
        ? INVENTOR_PROMOTED_TYPES
        : null;
    if (!promoted) {
      return entries;
    }
    const rank = new Map<string, number>(promoted.map((t, i) => [t, i]));
    return entries.sort((a, b) => {
      const ra = rank.has(a.type) ? rank.get(a.type)! : 100;
      const rb = rank.has(b.type) ? rank.get(b.type)! : 100;
      if (ra !== rb) {
        return ra - rb;
      }
      return a.label.localeCompare(b.label);
    });
  });

  readonly visibleRows = computed((): TreeRow[] => {
    const rows: TreeRow[] = [{ kind: 'root', id: 'workspace', depth: 0 }];
    if (!this.isOpen('workspace')) {
      return rows;
    }
    for (const group of this.groups()) {
      rows.push({
        kind: 'type',
        id: group.id,
        type: group.type,
        label: group.label,
        count: group.items.length,
        depth: 1,
      });
      if (!this.isOpen(group.id)) {
        continue;
      }
      for (const object of group.items) {
        rows.push({ kind: 'item', id: object.id, object, depth: 2 });
      }
    }
    return rows;
  });

  isOpen(id: string): boolean {
    return !this.collapsed().has(id);
  }

  toggle(id: string) {
    const next = new Set(this.collapsed());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.collapsed.set(next);
  }
}

