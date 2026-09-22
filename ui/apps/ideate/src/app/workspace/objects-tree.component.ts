import { Component, computed, input, output, signal } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import { MtIconComponent } from '@ideate/ui';

type TreeRow =
  | { kind: 'root'; id: 'workspace'; depth: 0 }
  | { kind: 'type'; id: string; type: string; label: string; count: number; depth: 1 }
  | { kind: 'item'; id: string; object: IdeaObject; depth: 2 };

@Component({
  selector: 'ideate-objects-tree',
  imports: [MtIconComponent],
  template: `
    <div class="tree" role="tree" aria-label="Workspace objects">
      @for (row of visibleRows(); track row.kind + ':' + row.id) {
        @if (row.kind === 'root') {
          <button type="button" class="row root" role="treeitem" [attr.aria-expanded]="isOpen('workspace')" (click)="toggle('workspace')">
            <span class="twist">
              <mt-icon [name]="isOpen('workspace') ? 'expand_more' : 'chevron_right'" [size]="14" />
            </span>
            <mt-icon name="sitemap" [size]="14" />
            <span class="name strong">Workspace</span>
          </button>
        } @else if (row.kind === 'type') {
          <button type="button" class="row branch" role="treeitem" [attr.aria-expanded]="isOpen(row.id)" (click)="toggle(row.id)">
            <span class="twist">
              <mt-icon [name]="isOpen(row.id) ? 'expand_more' : 'chevron_right'" [size]="14" />
            </span>
            <mt-icon name="folder" [size]="14" />
            <span class="name strong">{{ row.label }}</span>
            <span class="count">{{ row.count }}</span>
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
            <span class="id">{{ row.object.displayId }}</span>
            <span class="name">{{ row.object.title }}</span>
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
      align-items: center;
      gap: 0.28rem;
      width: 100%;
      min-height: 1.65rem;
      padding: 0 0.4rem 0 0.35rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      box-sizing: border-box;
      cursor: pointer;
    }
    .root:hover, .branch:hover { background: var(--surface-hover); }
    .branch { padding-left: 1.15rem; }
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
    .name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .name.strong { font-weight: 650; font-size: 0.78rem; letter-spacing: 0.02em; }
    .id {
      flex: 0 0 auto;
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--mt-primary, #10b981);
    }
    .count { margin-left: auto; font-size: 0.68rem; color: var(--mt-text-muted); }
    .muted { margin: 0.5rem 0.7rem; font-size: 0.75rem; color: var(--mt-text-muted); }
  `,
})
export class ObjectsTreeComponent {
  readonly nodes = input.required<IdeaObject[]>();
  readonly activeId = input<string | null>(null);
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
      label: typeLabel(type),
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

function typeLabel(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
