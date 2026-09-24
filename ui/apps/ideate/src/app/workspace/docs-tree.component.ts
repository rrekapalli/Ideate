import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MtButtonComponent, MtCheckboxComponent, MtConfirm, MtFieldComponent, MtIconComponent, MtTooltipDirective } from '@ideate/ui';
import { Attachment, DocumentFolder, DocumentItem, IdeaObject, IdeateApi, lookupLabel, lookupPluralLabel, personaIcon } from '@ideate/api-client';
import { TypeGlyphComponent } from '../shared/type-glyph.component';

export type DocTreeNode =
  | { kind: 'folder'; id: string; name: string; folder: DocumentFolder; children: DocTreeNode[] }
  | { kind: 'file'; id: string; name: string; item: DocumentItem }
  | { kind: 'root'; id: string; name: string; persona: string; workspaceKind: string; children: DocTreeNode[] }
  | { kind: 'group'; id: string; name: string; type: string | null; children: DocTreeNode[] }
  | { kind: 'node'; id: string; name: string; displayId: string; object: IdeaObject; children: DocTreeNode[] }
  | { kind: 'attachment'; id: string; name: string; attachment: Attachment };

type VisibleRow = { node: DocTreeNode; depth: number };

@Component({
  selector: 'ideate-docs-tree',
  imports: [FormsModule, MtButtonComponent, MtCheckboxComponent, MtFieldComponent, MtIconComponent, MtTooltipDirective, TypeGlyphComponent],
  template: `
    <div class="docs-header">
      <div class="docs-toolbar" role="toolbar" aria-label="Document commands">
        <mt-checkbox [checked]="allSelected()" mtTooltip="Select all" (checkedChange)="toggleAll($event)" />
        <mt-button variant="icon" size="sm" icon="folder" ariaLabel="New folder" mtTooltip="New folder" (clicked)="beginCreate('folder')" />
        <mt-button variant="icon" size="sm" icon="description" ariaLabel="New link" mtTooltip="New link" (clicked)="beginCreate('file')" />
        <mt-button variant="icon" size="sm" icon="open_in_new" ariaLabel="Open" mtTooltip="Open" [disabled]="selectedFiles().length === 0" (clicked)="openSelected()" />
        <mt-button variant="icon" size="sm" icon="share" ariaLabel="Attach" mtTooltip="Attach" [disabled]="selectedFiles().length === 0" (clicked)="attachSelected()" />
        <mt-button variant="icon" size="sm" icon="recycle_bin" ariaLabel="Delete" mtTooltip="Delete" [disabled]="selectedIds().size === 0" (clicked)="deleteSelected()" />
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
          @if (row.node.kind === 'root' || row.node.kind === 'folder' || row.node.kind === 'group' || row.node.kind === 'node') {
            <button type="button" class="twist" (click)="toggleExpand(row.node.id)">
              <mt-icon [name]="isOpen(row.node) ? 'expand_more' : 'chevron_right'" [size]="14" />
            </button>
            @if (row.node.kind === 'root') {
              <mt-icon [name]="personaIcon(row.node.persona)" [size]="14" [style.color]="row.node.persona ? 'var(--ideate-persona-' + row.node.persona + ')' : null" />
            } @else if (row.node.kind === 'group' && row.node.type) {
              <ideate-type-glyph [type]="row.node.type" [size]="14" />
            } @else if (row.node.kind === 'node') {
              <ideate-type-glyph [type]="row.node.object.type" [size]="12" />
            } @else {
              <mt-icon name="folder" [size]="14" />
            }
            <button type="button" class="name" (click)="row.node.kind === 'folder' ? focusFolder(row.node.id) : toggleExpand(row.node.id)">
              @if (row.node.kind === 'root') {
                <span class="strong">{{ row.node.name }}</span>
                <span class="sub">{{ lookupLabel(row.node.workspaceKind) }} · {{ lookupLabel(row.node.persona) }}</span>
              } @else {
                @if (row.node.kind === 'node') {
                  <span class="id">{{ row.node.displayId }}</span>
                }
                {{ row.node.name }}
              }
            </button>
          } @else if (row.node.kind === 'attachment') {
            <span class="twist"></span>
            <mt-icon name="description" [size]="14" />
            <button type="button" class="name" (dblclick)="openAttachment(row.node.attachment)">{{ row.node.name }}</button>
          } @else if (row.node.kind === 'file') {
            <span class="twist"></span>
            <mt-icon name="description" [size]="14" />
            <button type="button" class="name" (dblclick)="open.emit(row.node.item)">{{ row.node.name }}</button>
          }
        </div>
      }
      @if (libraryEmpty()) {
        <p class="muted">No documents yet. Attach a file on a card, or add a folder or link above.</p>
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
    .name { flex: 1; min-width: 0; text-align: left; background: none; border: 0; color: inherit; cursor: pointer; padding: 0.1rem 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .name:has(.sub) { white-space: normal; display: flex; flex-direction: column; align-items: flex-start; }
    .strong { font-weight: 650; }
    .sub { display: block; font-size: 0.68rem; font-weight: 500; color: var(--mt-text-muted); }
    .id { margin-right: 0.3rem; font-family: var(--font-family-mono, ui-monospace, monospace); font-size: 0.72rem; font-weight: 700; color: var(--mt-primary, #10b981); }
    .name:hover { background: var(--surface-hover); }
  `,
})
export class DocsTreeComponent {
  private readonly api = inject(IdeateApi);
  private readonly confirm = inject(MtConfirm);
  readonly workspaceId = input.required<string>();
  readonly folders = input.required<DocumentFolder[]>();
  readonly items = input.required<DocumentItem[]>();
  readonly nodes = input<IdeaObject[]>([]);
  readonly attachments = input<Attachment[]>([]);
  readonly workspaceName = input('');
  readonly persona = input('');
  readonly workspaceKind = input('workspace');
  readonly lookupLabel = lookupLabel;
  readonly personaIcon = personaIcon;
  readonly open = output<DocumentItem>();
  readonly changed = output<void>();

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly expanded = signal<Set<string>>(new Set());
  readonly collapsed = signal<Set<string>>(new Set());
  readonly creating = signal<'folder' | 'file' | null>(null);
  readonly focusFolderId = signal<string | null>(null);
  newFolder = '';
  newDocName = '';
  newDocUrl = '';

  readonly tree = computed(() => {
    const children = [
      ...buildAttachmentTree(this.nodes(), this.attachments()),
      ...buildDocTree(this.folders(), this.items()),
    ];
    const root: DocTreeNode = {
      kind: 'root',
      id: 'workspace',
      name: this.workspaceName() || 'Workspace',
      persona: this.persona(),
      workspaceKind: this.workspaceKind(),
      children,
    };
    return [root];
  });
  readonly libraryEmpty = computed(() => {
    const root = this.tree()[0];
    return root.kind === 'root' && root.children.length === 0;
  });
  readonly visibleRows = computed(() => flattenVisible(this.tree(), this.expanded(), this.collapsed()));
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

  isOpen(node: DocTreeNode): boolean {
    if (node.kind === 'root' || node.kind === 'group' || node.kind === 'node') {
      return !this.collapsed().has(node.id);
    }
    return this.expanded().has(node.id);
  }

  openAttachment(item: Attachment): void {
    this.api.attachmentContent(this.workspaceId(), item.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  toggleExpand(id: string): void {
    const node = this.visibleRows().find((row) => row.node.id === id)?.node;
    if (node && (node.kind === 'root' || node.kind === 'group' || node.kind === 'node')) {
      this.collapsed.update((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
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
      const keys = node.kind === 'file' || node.kind === 'attachment' ? [node.kind + ':' + node.id] : collectKeys(node);
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
    if (!ids.length) return;
    const folders = ids.filter((k) => k.startsWith('folder:')).map((k) => k.slice(7));
    const files = ids.filter((k) => k.startsWith('file:')).map((k) => k.slice(5));
    const attachments = ids.filter((k) => k.startsWith('attachment:')).map((k) => k.slice(11));
    const n = folders.length + files.length + attachments.length;
    this.confirm.confirm({
      header: n === 1 ? 'Delete item?' : 'Delete items?',
      message: `Delete the selected folders and files? This cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => {
        let pending = n;
        const done = () => {
          pending -= 1;
          if (pending <= 0) {
            this.selectedIds.set(new Set());
            this.changed.emit();
          }
        };
        for (const id of files) this.api.deleteDocument(this.workspaceId(), id).subscribe({ next: done, error: done });
        for (const id of folders) this.api.deleteFolder(this.workspaceId(), id).subscribe({ next: done, error: done });
        for (const id of attachments) this.api.deleteAttachment(this.workspaceId(), id).subscribe({ next: done, error: done });
      },
    });
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
  if (node.kind === 'root' || node.kind === 'folder' || node.kind === 'group' || node.kind === 'node') {
    for (const child of node.children) keys.push(...collectKeys(child));
  }
  return keys;
}

function flattenVisible(nodes: DocTreeNode[], expanded: Set<string>, collapsed: Set<string>, depth = 0): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    const open = node.kind === 'root' || node.kind === 'group' || node.kind === 'node'
      ? !collapsed.has(node.id)
      : node.kind === 'folder' && expanded.has(node.id);
    if (open && (node.kind === 'root' || node.kind === 'folder' || node.kind === 'group' || node.kind === 'node')) {
      rows.push(...flattenVisible(node.children, expanded, collapsed, depth + 1));
    }
  }
  return rows;
}

function buildAttachmentTree(nodes: IdeaObject[], attachments: Attachment[]): DocTreeNode[] {
  const byObject = new Map<string, Attachment[]>();
  const misc: Attachment[] = [];
  for (const file of attachments) {
    if (file.objectId && nodes.some((n) => n.id === file.objectId)) {
      const list = byObject.get(file.objectId) ?? [];
      list.push(file);
      byObject.set(file.objectId, list);
    } else {
      misc.push(file);
    }
  }
  const byType = new Map<string, IdeaObject[]>();
  for (const object of nodes) {
    if (!byObject.has(object.id)) continue;
    const list = byType.get(object.type) ?? [];
    list.push(object);
    byType.set(object.type, list);
  }
  const groups: DocTreeNode[] = [...byType.entries()].map(([type, objects]) => ({
    kind: 'group' as const,
    id: 'type:' + type,
    name: lookupPluralLabel(type) + ' - (' + objects.length + ')',
    type,
    children: objects.map((object) => ({
      kind: 'node' as const,
      id: object.id,
      name: object.title || 'Untitled',
      displayId: object.displayId,
      object,
      children: (byObject.get(object.id) ?? []).map(attachmentNode),
    })),
  }));
  if (misc.length) {
    groups.push({
      kind: 'group',
      id: 'type:misc',
      name: 'Misc - (' + misc.length + ')',
      type: null,
      children: misc.map(attachmentNode),
    });
  }
  return groups;
}

function attachmentNode(file: Attachment): DocTreeNode {
  return { kind: 'attachment', id: file.id, name: file.originalName, attachment: file };
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
