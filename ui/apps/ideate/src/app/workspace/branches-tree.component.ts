import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MtButtonComponent, MtCheckboxComponent, MtConfirm, MtFieldComponent, MtIconComponent, MtTooltipDirective } from '@ideate/ui';
import { IdeateApi, WorkspaceBranch } from '@ideate/api-client';

type BranchNode = { branch: WorkspaceBranch; children: BranchNode[] };
type VisibleRow = { branch: WorkspaceBranch; depth: number; hasChildren: boolean };

@Component({
  selector: 'ideate-branches-tree',
  imports: [FormsModule, MtButtonComponent, MtCheckboxComponent, MtFieldComponent, MtIconComponent, MtTooltipDirective],
  template: `
    <div class="docs-header">
      <div class="docs-toolbar" role="toolbar" aria-label="Branch commands">
        <mt-checkbox [checked]="allSelected()" mtTooltip="Select all" (checkedChange)="toggleAll($event)" />
        <mt-button variant="icon" size="sm" icon="add" ariaLabel="New overlay" mtTooltip="New overlay" (clicked)="beginCreate()" />
        <mt-button variant="icon" size="sm" icon="visibility" ariaLabel="Open" mtTooltip="Open" [disabled]="!singleSelected()" (clicked)="openSelected()" />
        <mt-button variant="icon" size="sm" icon="recycle_bin" ariaLabel="Delete" mtTooltip="Delete" [disabled]="!canDeleteSelection()" (clicked)="deleteSelected()" />
      </div>
    </div>
    @if (creating()) {
      <div class="docs-create">
        <mt-field label="Overlay name" [(ngModel)]="newName" />
        <mt-button size="sm" [label]="'Create overlay'" [disabled]="!newName.trim()" (clicked)="createOverlay()" />
        <p class="hint">Creates under {{ parentLabel() }}</p>
      </div>
    }
    <div class="docs-tree" role="tree">
      @for (row of visibleRows(); track row.branch.id) {
        <div
          class="row"
          [class.row--active]="activeBranchId() === row.branch.id"
          [style.padding-left.px]="8 + row.depth * 14"
          role="treeitem"
        >
          <mt-checkbox [checked]="selectedIds().has(row.branch.id)" (checkedChange)="toggle(row.branch, $event)" />
          @if (row.hasChildren) {
            <button type="button" class="twist" (click)="toggleExpand(row.branch.id)">
              <mt-icon [name]="expanded().has(row.branch.id) ? 'expand_more' : 'chevron_right'" [size]="14" />
            </button>
          } @else {
            <span class="twist"></span>
          }
          <mt-icon name="share" [size]="14" />
          <button type="button" class="name" (click)="focusBranch(row.branch)" (dblclick)="open.emit(row.branch)">
            {{ row.branch.name }}
            <span class="role">{{ row.branch.branchRole }}</span>
          </button>
        </div>
      }
      @if (visibleRows().length === 0) {
        <p class="muted">No branches yet.</p>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .docs-header { flex: none; border-bottom: 1px solid var(--surface-border); padding: 0.2rem 0.35rem; }
    .docs-toolbar { display: flex; flex-wrap: nowrap; align-items: center; gap: 0.1rem; min-height: 1.75rem; }
    .docs-create { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--surface-border); }
    .hint, .muted { margin: 0.35rem 0.5rem; font-size: 0.72rem; color: var(--mt-text-muted); }
    .docs-tree { flex: 1; min-height: 0; overflow: auto; padding: 0.25rem 0; }
    .row { display: flex; align-items: center; gap: 0.25rem; min-height: 1.6rem; }
    .row--active { background: var(--mt-nav-active-bg, var(--surface-hover)); }
    .twist { width: 1rem; height: 1rem; border: 0; background: none; padding: 0; color: inherit; cursor: pointer; display: inline-flex; }
    .name { flex: 1; text-align: left; background: none; border: 0; color: inherit; cursor: pointer; padding: 0.1rem 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .name:hover { background: var(--surface-hover); }
    .role { margin-left: 0.35rem; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--mt-text-muted); }
  `,
})
export class BranchesTreeComponent {
  private readonly api = inject(IdeateApi);
  private readonly confirm = inject(MtConfirm);
  readonly workspaceId = input.required<string>();
  readonly branches = input.required<WorkspaceBranch[]>();
  readonly activeBranchId = input<string | null>(null);
  readonly open = output<WorkspaceBranch>();
  readonly changed = output<void>();

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly expanded = signal<Set<string>>(new Set());
  readonly creating = signal(false);
  readonly focusId = signal<string | null>(null);
  newName = '';

  readonly tree = computed(() => buildBranchTree(this.branches()));
  readonly visibleRows = computed(() => flattenVisible(this.tree(), this.expanded()));
  readonly allSelected = computed(() => {
    const all = this.branches();
    return all.length > 0 && all.every((b) => this.selectedIds().has(b.id));
  });

  beginCreate(): void {
    this.creating.update((v) => !v);
  }

  focusBranch(branch: WorkspaceBranch): void {
    this.focusId.set(branch.id);
    this.expanded.update((s) => new Set(s).add(branch.id));
  }

  toggleExpand(id: string): void {
    this.expanded.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggle(branch: WorkspaceBranch, checked: boolean): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      const ids = collectIds(findNode(this.tree(), branch.id));
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    if (checked) this.focusBranch(branch);
  }

  toggleAll(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.branches().map((b) => b.id)) : new Set());
  }

  singleSelected(): WorkspaceBranch | null {
    const ids = [...this.selectedIds()];
    if (ids.length !== 1) return this.focusId() ? this.branches().find((b) => b.id === this.focusId()) ?? null : null;
    return this.branches().find((b) => b.id === ids[0]) ?? null;
  }

  parentLabel(): string {
    return this.singleSelected()?.name ?? 'Mainstream';
  }

  canDeleteSelection(): boolean {
    const selected = this.branches().filter((b) => this.selectedIds().has(b.id));
    return selected.length > 0 && selected.every((b) => b.branchRole !== 'mainstream');
  }

  createOverlay(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.api.createBranch(this.workspaceId(), name, this.singleSelected()?.id).subscribe(() => {
      this.newName = '';
      this.creating.set(false);
      this.changed.emit();
    });
  }

  openSelected(): void {
    const branch = this.singleSelected();
    if (branch) this.open.emit(branch);
  }

  deleteSelected(): void {
    const selected = this.branches().filter((b) => this.selectedIds().has(b.id) && b.branchRole !== 'mainstream');
    if (!selected.length) return;
    const names = selected.map((b) => b.name).join(', ');
    this.confirm.confirm({
      header: selected.length === 1 ? 'Delete overlay?' : 'Delete overlays?',
      message: `Delete ${selected.length === 1 ? `overlay “${names}”` : `${selected.length} overlay branches`} and their objects? This cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => {
        let pending = selected.length;
        const done = () => {
          pending -= 1;
          if (pending <= 0) {
            this.selectedIds.set(new Set());
            this.changed.emit();
          }
        };
        for (const b of selected) this.api.deleteBranch(this.workspaceId(), b.id).subscribe({ next: done, error: done });
      },
    });
  }
}

function buildBranchTree(branches: WorkspaceBranch[]): BranchNode[] {
  const byParent = new Map<string | undefined, WorkspaceBranch[]>();
  for (const b of branches) {
    const key = b.parentBranchId || undefined;
    const list = byParent.get(key) ?? [];
    list.push(b);
    byParent.set(key, list);
  }
  const walk = (parentId?: string): BranchNode[] =>
    (byParent.get(parentId) ?? []).map((branch) => ({ branch, children: walk(branch.id) }));
  const roots = walk(undefined);
  if (roots.length) return roots;
  return branches.filter((b) => b.branchRole === 'mainstream').map((branch) => ({ branch, children: walk(branch.id) }));
}

function flattenVisible(nodes: BranchNode[], expanded: Set<string>, depth = 0): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ branch: node.branch, depth, hasChildren: node.children.length > 0 });
    if (expanded.has(node.branch.id)) rows.push(...flattenVisible(node.children, expanded, depth + 1));
  }
  return rows;
}

function findNode(nodes: BranchNode[], id: string): BranchNode | null {
  for (const node of nodes) {
    if (node.branch.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function collectIds(node: BranchNode | null): string[] {
  if (!node) return [];
  return [node.branch.id, ...node.children.flatMap((c) => collectIds(c))];
}
