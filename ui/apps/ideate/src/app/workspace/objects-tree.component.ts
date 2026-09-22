import { Component, computed, input, output, signal } from '@angular/core';
import { IdeaObject, lookupLabel, personaIcon } from '@ideate/api-client';
import { MtIconComponent } from '@ideate/ui';
import { TypeGlyphComponent } from '../shared/type-glyph.component';

type TreeRow =
  | { kind: 'root'; id: 'workspace'; depth: 0 }
  | { kind: 'type'; id: string; type: string; label: string; count: number; depth: 1 }
  | { kind: 'item'; id: string; object: IdeaObject; depth: 2 };

@Component({
  selector: 'ideate-objects-tree',
  imports: [MtIconComponent, TypeGlyphComponent],
  template: `
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
  `,
  styles: `
    :host { display: block; min-height: 0; }
    .tree { padding: 0.3rem 0 0.6rem; }
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

  readonly collapsed = signal(new Set<string>());

  readonly groups = computed(() => {
    const map = new Map<string, IdeaObject[]>();
    for (const n of this.nodes()) {
      const list = map.get(n.type) ?? [];
      list.push(n);
      map.set(n.type, list);
    }
    return [...map.entries()].map(([type, items]) => ({
      type,
      id: 'type:' + type,
      label: lookupLabel(type),
      items,
    }));
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

