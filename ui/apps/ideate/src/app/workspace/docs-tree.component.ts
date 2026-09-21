import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MtButtonComponent, MtCheckboxComponent, MtFieldComponent, MtIconComponent, MtTooltipDirective } from '@ideate/ui';
import { DocumentFolder, DocumentItem, IdeateApi } from '@ideate/api-client';

export type DocTreeNode =
  | { kind: 'folder'; id: string; name: string; folder: DocumentFolder; children: DocTreeNode[] }
  | { kind: 'file'; id: string; name: string; item: DocumentItem };

type VisibleRow = { node: DocTreeNode; depth: number };

@Component({
  selector: 'ideate-docs-tree',
  imports: [FormsModule, MtButtonComponent, MtCheckboxComponent, MtFieldComponent, MtIconComponent, MtTooltipDirective],
  template: `
    <div class="docs-header">
      <div class="docs-toolbar" role="toolbar" aria-label="Document commands">
        <mt-checkbox [checked]="allSelected()" mtTooltip="Select all" (checkedChange)="toggleAll($event)" />
        <mt-button variant="icon" size="sm" icon="folder" ariaLabel="New folder" mtTooltip="New folder" (clicked)="beginCreate('folder')" />
        <mt-button variant="icon" size="sm" icon="description" ariaLabel="New link" mtTooltip="New link" (clicked)="beginCreate('file')" />
        <mt-button variant="icon" size="sm" icon="open_in_new" ariaLabel="Open" mtTooltip="Open" [disabled]="selectedFiles().length === 0" (clicked)="openSelected()" />
        <mt-button variant="icon" size="sm" icon="share" ariaLabel="Attach" mtTooltip="Attach" [disabled]="selectedFiles().length === 0" (clicked)="attachSelected()" />
        <mt-button variant="icon" size="sm" icon="delete" ariaLabel="Delete" mtTooltip="Delete" [disabled]="selectedIds().size === 0" (clicked)="deleteSelected()" />
      </div>
    </div>
    @if (creating(); as mode) {
      <div class="docs-create">
        @if (mode === 'folder') {
          <mt-field label="Folder name" [(ngModel)]="newFolder" />
          <mt-button size="sm" [label]="'Create folder'" [disabled]="!newFolder.trim()" (clicked)="createFolder()" />
        } @else {
          <mt-field label="Name" [(ngModel)]="newDocName" />
          <mt-field label="URL" [(ngModel)]="newDocUrl" />
          <mt-button size="sm" [label]="'Add link'" [disabled]="!newDocName.trim() || !newDocUrl.trim()" (clicked)="createLink()" />
        }
        <p class="hint">Creates in {{ targetFolderLabel() }}</p>
      </div>
    }
    <div class="docs-tree" role="tree">
      @for (row of visibleRows(); track row.node.kind + ':' + row.node.id) {
        <div class="row" [style.padding-left.px]="8 + row.depth * 14" role="treeitem">
          <mt-checkbox
            [checked]="selectedIds().has(row.node.kind + ':' + row.node.id)"
            (checkedChange)="toggle(row.node, $event)"
          />
          @if (row.node.kind === 'folder') {
            <button type="button" class="twist" (click)="toggleExpand(row.node.id)">
              <mt-icon [name]="expanded().has(row.node.id) ? 'expand_more' : 'chevron_right'" [size]="14" />
            </button>
            <mt-icon name="folder" [size]="14" />
            <button type="button" class="name" (click)="focusFolder(row.node.id)">{{ row.node.name }}</button>
          } @else {
            <span class="twist"></span>
            <mt-icon name="description" [size]="14" />
            <button type="button" class="name" (dblclick)="open.emit(row.node.item)">{{ row.node.name }}</button>
          }
        </div>
      }
      @if (visibleRows().length === 0) {
        <p class="muted">Empty library. Use Folder or Link above.</p>
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
    .twist { width: 1rem; height: 1rem; border: 0; background: none; padding: 0; color: inherit; cursor: pointer; display: inline-flex; }
    .name { flex: 1; text-align: left; background: none; border: 0; color: inherit; cursor: pointer; padding: 0.1rem 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .name:hover { background: var(--surface-hover); }
  `,
})
export class DocsTreeComponent {
  private readonly api = inject(IdeateApi);
  readonly workspaceId = input.required<string>();
  readonly folders = input.required<DocumentFolder[]>();
  readonly items = input.required<DocumentItem[]>();
  readonly open = output<DocumentItem>();
  readonly changed = output<void>();

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly expanded = signal<Set<string>>(new Set());
  readonly creating = signal<'folder' | 'file' | null>(null);
  readonly focusFolderId = signal<string | null>(null);
  newFolder = '';
  newDocName = '';
  newDocUrl = '';

  readonly tree = computed(() => buildDocTree(this.folders(), this.items()));
  readonly visibleRows = computed(() => flattenVisible(this.tree(), this.expanded()));
  readonly selectedFiles = computed(() => {
    const ids = this.selectedIds();
    return this.items().filter((i) => ids.has('file:' + i.id));
  });
  readonly allKeys = computed(() => this.tree().flatMap((n) => collectKeys(n)));
  readonly allSelected = computed(() => {
    const keys = this.allKeys();
    return keys.length > 0 && keys.every((k) => this.selectedIds().has(k));
  });

  targetFolderLabel(): string {
    const id = this.singleSelectedFolderId() ?? this.focusFolderId();
    if (!id) return 'library root';
    return this.folders().find((f) => f.id === id)?.name ?? 'library root';
  }

  beginCreate(mode: 'folder' | 'file'): void {
    this.creating.set(this.creating() === mode ? null : mode);
  }

  focusFolder(id: string): void {
    this.focusFolderId.set(id);
    this.expanded.update((s) => new Set(s).add(id));
  }

  toggleExpand(id: string): void {
    this.expanded.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggle(node: DocTreeNode, checked: boolean): void {
    this.selectedIds.update((s) => {
      const next = new Set(s);
      const keys = node.kind === 'folder' ? collectKeys(node) : [node.kind + ':' + node.id];
      for (const k of keys) {
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
    if (node.kind === 'folder' && checked) this.focusFolder(node.id);
  }

  toggleAll(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.allKeys()) : new Set());
  }

  createFolder(): void {
    const name = this.newFolder.trim();
    if (!name) return;
    this.api.createFolder(this.workspaceId(), name, this.parentFolderId()).subscribe(() => {
      this.newFolder = '';
      this.creating.set(null);
      this.changed.emit();
    });
  }

  createLink(): void {
    if (!this.newDocName.trim() || !this.newDocUrl.trim()) return;
    this.api.createDocument(this.workspaceId(), {
      folderId: this.parentFolderId() ?? undefined,
      name: this.newDocName.trim(),
      url: this.newDocUrl.trim(),
    }).subscribe(() => {
      this.newDocName = '';
      this.newDocUrl = '';
      this.creating.set(null);
      this.changed.emit();
    });
  }

  openSelected(): void {
    for (const item of this.selectedFiles()) this.open.emit(item);
  }

  attachSelected(): void {
    const files = this.selectedFiles();
    if (!files.length) return;
    let pending = files.length;
    for (const item of files) {
      this.api.attachDocument(this.workspaceId(), item.id).subscribe(() => {
        pending -= 1;
        if (pending === 0) this.changed.emit();
      });
    }
  }

  deleteSelected(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length || !window.confirm('Delete the selected folders and files?')) return;
    const folders = ids.filter((k) => k.startsWith('folder:')).map((k) => k.slice(7));
    const files = ids.filter((k) => k.startsWith('file:')).map((k) => k.slice(5));
    let pending = folders.length + files.length;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.selectedIds.set(new Set());
        this.changed.emit();
      }
    };
    for (const id of files) this.api.deleteDocument(this.workspaceId(), id).subscribe({ next: done, error: done });
    for (const id of folders) this.api.deleteFolder(this.workspaceId(), id).subscribe({ next: done, error: done });
  }

  private parentFolderId(): string | undefined {
    return this.singleSelectedFolderId() ?? this.focusFolderId() ?? undefined;
  }

  private singleSelectedFolderId(): string | null {
    const folders = [...this.selectedIds()].filter((k) => k.startsWith('folder:')).map((k) => k.slice(7));
    return folders.length === 1 ? folders[0] : null;
  }
}

function collectKeys(node: DocTreeNode): string[] {
  const keys = [node.kind + ':' + node.id];
  if (node.kind === 'folder') {
    for (const child of node.children) keys.push(...collectKeys(child));
  }
  return keys;
}

function flattenVisible(nodes: DocTreeNode[], expanded: Set<string>, depth = 0): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.kind === 'folder' && expanded.has(node.id)) {
      rows.push(...flattenVisible(node.children, expanded, depth + 1));
    }
  }
  return rows;
}

function buildDocTree(folders: DocumentFolder[], items: DocumentItem[]): DocTreeNode[] {
  const byParent = new Map<string | undefined, DocumentFolder[]>();
  for (const f of folders) {
    const key = f.parentId || undefined;
    const list = byParent.get(key) ?? [];
    list.push(f);
    byParent.set(key, list);
  }
  const filesByFolder = new Map<string | undefined, DocumentItem[]>();
  for (const item of items) {
    const key = item.folderId || undefined;
    const list = filesByFolder.get(key) ?? [];
    list.push(item);
    filesByFolder.set(key, list);
  }
  const walk = (parentId?: string): DocTreeNode[] => {
    const nodes: DocTreeNode[] = [];
    for (const folder of byParent.get(parentId) ?? []) {
      nodes.push({
        kind: 'folder',
        id: folder.id,
        name: folder.name,
        folder,
        children: walk(folder.id),
      });
    }
    for (const item of filesByFolder.get(parentId) ?? []) nodes.push(fileNode(item));
    return nodes;
  };
  return walk(undefined);
}

function fileNode(item: DocumentItem): DocTreeNode {
  return { kind: 'file', id: item.id, name: item.name, item };
}
