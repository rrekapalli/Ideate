import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MtButtonComponent, MtIconComponent } from '@ideate/ui';
import {
  DocumentFolder,
  DocumentItem,
  GraphProblem,
  GraphSnapshot,
  IdeaObject,
  IdeateApi,
  JobRecord,
  MODES,
  OBJECT_TYPES,
  TimelineEvent,
  TranscriptMessage,
  UsageRollup,
  Workspace,
  WorkspaceBranch,
} from '@ideate/api-client';
import { ShellContextService } from '../core/shell/shell-context.service';
import { DrawerResizeComponent } from '../core/nav/drawer-resize.component';
import { GraphCanvasComponent } from './graph-canvas.component';
import { ObjectPageComponent } from './object-page.component';
import { DocsTreeComponent } from './docs-tree.component';
import { BranchesTreeComponent } from './branches-tree.component';
import { MdViewComponent } from '../shared/md-view.component';
import { ancestorPath } from './chat-context';

type EditorTab =
  | { kind: 'graph' }
  | { kind: 'object'; object: IdeaObject }
  | { kind: 'document'; item: DocumentItem };

type LeftTab = 'objects' | 'documents' | 'branches';
type RightTab = 'chat' | 'insights' | 'inspector' | 'outline';
type BottomTab = 'timeline' | 'review' | 'jobs' | 'problems';

@Component({
  selector: 'ideate-workspace-shell',
  imports: [FormsModule, MtButtonComponent, MtIconComponent, GraphCanvasComponent, ObjectPageComponent, DocsTreeComponent, BranchesTreeComponent, DrawerResizeComponent, MdViewComponent],
  templateUrl: './workspace-shell.component.html',
  styleUrl: './workspace-shell.component.scss',
})
export class WorkspaceShellComponent implements OnInit, OnDestroy {
  private readonly api = inject(IdeateApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly shell = inject(ShellContextService);
  private readonly subs = new Subscription();

  @ViewChild('canvas') canvas?: GraphCanvasComponent;
  @ViewChild('chatBody') chatBody?: ElementRef<HTMLElement>;

  workspace = signal<Workspace | null>(null);
  graph = signal<GraphSnapshot>({ nodes: [], edges: [] });
  transcript = signal<TranscriptMessage[]>([]);
  documents = signal<DocumentItem[]>([]);
  folders = signal<DocumentFolder[]>([]);
  branches = signal<WorkspaceBranch[]>([]);
  activeBranchId = signal<string | null>(null);
  jobs = signal<JobRecord[]>([]);
  timeline = signal<TimelineEvent[]>([]);
  problems = signal<GraphProblem[]>([]);
  credits = signal(0);
  usageMinor = signal(0);
  usage = signal<UsageRollup | null>(null);
  tabs = signal<EditorTab[]>([{ kind: 'graph' }]);
  activeTab = signal(0);
  rightOpen = signal(true);
  rightTab = signal<RightTab>('chat');
  bottomOpen = signal(false);
  bottomTab = signal<BottomTab>('timeline');
  inspected = signal<IdeaObject | null>(null);
  chatFrom = signal<IdeaObject | null>(null);
  chatPath = signal<IdeaObject[]>([]);
  highlightedMsg = signal<string | null>(null);
  searchOpen = signal(false);
  searchQuery = '';
  searchObjects = signal<IdeaObject[]>([]);
  searchDocs = signal<DocumentItem[]>([]);
  showSettings = signal(false);
  draft = '';
  mode = 'explore';
  modes = MODES;
  types = OBJECT_TYPES;
  sending = signal(false);
  workspaceId = '';
  private objectRowTapAt = 0;
  private objectRowTapId = '';

  ngOnInit() {
    this.restoreChrome();
    this.workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
    const objectId = this.route.snapshot.paramMap.get('objectId');
    this.api.getWorkspace(this.workspaceId).subscribe({
      next: (res) => {
        this.workspace.set(res.workspace);
        this.branches.set(res.branches ?? []);
        this.activeBranchId.set(res.workspace.mainstreamBranchId ?? res.branches?.[0]?.id ?? null);
        this.pushShell();
        this.reloadAll(() => {
          if (objectId) {
            this.api.getObject(this.workspaceId, objectId).subscribe((obj) => this.openObject(obj));
          }
        });
      },
      error: () => this.router.navigate(['/']),
    });
    this.subs.add(this.shell.searchSubmit.subscribe((q) => {
      this.searchQuery = q;
      this.runSearch();
    }));
    this.subs.add(this.shell.settingsClick.subscribe(() => this.showSettings.set(true)));
    this.subs.add(this.shell.newThoughtClick.subscribe(() => this.newThought()));
  }

  explorerOpen(): boolean {
    return this.shell.explorerDrawerOpen();
  }

  explorerTab(): LeftTab {
    const d = this.shell.leftDrawer();
    return d === 'documents' || d === 'branches' ? d : 'objects';
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.shell.clearWorkspace();
  }

  @HostListener('document:keydown', ['$event'])
  onKey(ev: KeyboardEvent) {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'p') {
      ev.preventDefault();
      this.searchOpen.set(true);
    }
  }

  reloadAll(after?: () => void) {
    const branchId = this.activeBranchId() ?? undefined;
    this.api.graph(this.workspaceId, branchId).subscribe((g) => {
      this.graph.set(g);
      after?.();
    });
    this.api.transcript(this.workspaceId, branchId).subscribe((t) => this.transcript.set(t));
    this.api.getWorkspace(this.workspaceId).subscribe((res) => {
      this.workspace.set(res.workspace);
      this.branches.set(res.branches ?? []);
      this.pushShell();
    });
    this.api.documents(this.workspaceId).subscribe((d) => {
      this.folders.set(d.folders ?? []);
      this.documents.set(d.items ?? []);
    });
    this.api.jobs(this.workspaceId).subscribe((j) => this.jobs.set(j));
    this.api.timeline(this.workspaceId).subscribe((t) => this.timeline.set(t));
    this.api.problems(this.workspaceId).subscribe((p) => this.problems.set(p.map((x) => ({ ...x, objectIds: x.objectIds ?? [] }))));
    this.api.credits().subscribe((c) => {
      this.credits.set(c.balance);
      this.pushShell();
    });
    this.api.usage(this.workspaceId).subscribe((u) => {
      this.usage.set({
        workspaceId: u.workspaceId ?? this.workspaceId,
        estimatedCostMinorInr: u.estimatedCostMinorInr ?? 0,
        recent: u.recent ?? [],
      });
      this.usageMinor.set(u.estimatedCostMinorInr ?? 0);
      this.pushShell();
    });
  }

  objectGroups() {
    const map = new Map<string, IdeaObject[]>();
    for (const n of this.graph().nodes) {
      const list = map.get(n.type) ?? [];
      list.push(n);
      map.set(n.type, list);
    }
    return [...map.entries()].map(([type, nodes]) => ({ type, nodes }));
  }

  currentTab(): EditorTab | undefined {
    return this.tabs()[this.activeTab()];
  }

  tabKey(tab: EditorTab): string {
    if (tab.kind === 'graph') return 'graph';
    if (tab.kind === 'object') return 'obj-' + tab.object.id;
    return 'doc-' + tab.item.id;
  }

  tabLabel(tab: EditorTab): string {
    if (tab.kind === 'graph') return 'Graph';
    if (tab.kind === 'object') return tab.object.displayId;
    return tab.item.name;
  }

  openObject(object: IdeaObject) {
    const tabs = this.tabs();
    const idx = tabs.findIndex((t) => t.kind === 'object' && t.object.id === object.id);
    if (idx >= 0) {
      this.activeTab.set(idx);
      return;
    }
    this.tabs.set([...tabs, { kind: 'object', object }]);
    this.activeTab.set(this.tabs().length - 1);
  }

  openDocument(item: DocumentItem) {
    const tabs = this.tabs();
    const idx = tabs.findIndex((t) => t.kind === 'document' && t.item.id === item.id);
    if (idx >= 0) {
      this.activeTab.set(idx);
      return;
    }
    this.tabs.set([...tabs, { kind: 'document', item }]);
    this.activeTab.set(this.tabs().length - 1);
  }

  closeTab(i: number) {
    const next = this.tabs().filter((_, idx) => idx !== i);
    this.tabs.set(next);
    this.activeTab.set(0);
  }

  focusObject(object: IdeaObject) {
    this.activeTab.set(0);
    this.setChatContext(object);
    window.setTimeout(() => this.canvas?.focus(object.id), 0);
  }

  onObjectRowActivate(object: IdeaObject) {
    const now = performance.now();
    if (this.objectRowTapId === object.id && now - this.objectRowTapAt < 450) {
      this.objectRowTapAt = 0;
      this.openObject(object);
      return;
    }
    this.objectRowTapId = object.id;
    this.objectRowTapAt = now;
    this.focusObject(object);
  }

  setChatContext(object: IdeaObject) {
    this.inspected.set(object);
    this.chatFrom.set(object);
    this.chatPath.set(ancestorPath(this.graph(), object));
  }

  ancestorPathFor(object: IdeaObject): IdeaObject[] {
    return ancestorPath(this.graph(), object);
  }

  changeType(object: IdeaObject, type: string) {
    this.api.updateObject(this.workspaceId, object.id, { type }).subscribe(() => this.reloadAll());
  }

  promptNewNode(object: IdeaObject) {
    const type = window.prompt('New node type', 'thought') ?? '';
    const title = window.prompt('Title', 'Untitled') ?? '';
    if (!type || !title) return;
    this.api.newNode(this.workspaceId, object.id, { type, title }).subscribe(() => this.reloadAll());
  }

  promptMenu(object: IdeaObject) {
    const action = window.prompt('Action: delete | branch | category', 'delete');
    if (action === 'delete') {
      this.api.deleteObject(this.workspaceId, object.id).subscribe(() => this.reloadAll());
    } else if (action === 'branch') {
      const name = window.prompt('Overlay name');
      if (name) this.api.newBranch(this.workspaceId, object.id, name).subscribe(() => this.reloadAll());
    } else if (action === 'category') {
      const cat = window.prompt('object_category', object.objectCategory);
      if (cat) this.api.updateObject(this.workspaceId, object.id, { objectCategory: cat }).subscribe(() => this.reloadAll());
    }
  }

  jumpChat(object: IdeaObject) {
    this.setChatContext(object);
    this.rightTab.set('chat');
    this.rightOpen.set(true);
    this.persistChrome();
    const userId = object.sourceUserMessageId;
    const asstId = object.sourceAssistantMessageId;
    this.highlightedMsg.set(userId ?? asstId ?? null);
    queueMicrotask(() => {
      document.getElementById('msg-' + (userId ?? asstId))?.scrollIntoView({ block: 'center' });
    });
  }

  clearChatFocus() {
    this.chatFrom.set(null);
    this.chatPath.set([]);
  }

  chatPathLabel(): string {
    const path = this.chatPath();
    if (path.length === 0) {
      return this.chatFrom() ? `${this.chatFrom()!.displayId} · ${this.chatFrom()!.title}` : '';
    }
    return path.map((n) => n.displayId).join(' › ');
  }

  openById(objectId?: string) {
    if (!objectId) return;
    const found = this.graph().nodes.find((n) => n.id === objectId || n.displayId === objectId);
    if (found) {
      this.openObject(found);
      return;
    }
    this.api.getObject(this.workspaceId, objectId).subscribe({
      next: (obj) => this.openObject(obj),
      error: () => undefined,
    });
  }

  displayOf(objectId: string): string {
    return this.graph().nodes.find((n) => n.id === objectId)?.displayId ?? objectId;
  }

  message(id?: string): TranscriptMessage | null {
    if (!id) return null;
    return this.transcript().find((m) => m.id === id) ?? null;
  }

  chatText(m: TranscriptMessage): string {
    const text = (m.content ?? '').trim();
    if (/I\/O error|Read timed out|Connection refused|model was unreachable|UnknownHostException/i.test(text)) {
      return 'The model didn’t respond just now. Your message is saved — try sending again.';
    }
    if (m.role === 'assistant') {
      return this.cleanAssistantChat(text);
    }
    return text;
  }

  private cleanAssistantChat(text: string): string {
    const withoutJson = text.replace(/```(?:json)?[\s\S]*?```/g, ' ')
        .replace(/\{[\s\S]*"tools"[\s\S]*\}/g, ' ')
        .replace(/^\s*(Create (Node|Edge)|create_node|create_edge).*$/gim, ' ');
    const kept = withoutJson
        .split('\n')
        .filter((s) => !/the graph includes|the graph has|necessary edges|properly linked|edges connect|updated the (workspace )?graph|displayId|create_node|typed cards/i.test(s));
    const out = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (out.length >= 12) {
      return out;
    }
    return 'Let’s stay with the question itself — ask it again in your own words if this reply looked empty.';
  }

  chatWhen(raw?: string): string {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  newThought() {
    this.api.createObject(this.workspaceId, { type: 'thought', title: 'New thought', summary: '' }).subscribe(() => this.reloadAll());
  }

  openBranch(branch: WorkspaceBranch) {
    this.activeBranchId.set(branch.id);
    this.activeTab.set(0);
    this.reloadAll();
  }

  send() {
    const content = this.draft.trim();
    if (!content) return;
    this.sending.set(true);
    const path = this.chatPath();
    const focus = path.length ? path : this.chatFrom() ? [this.chatFrom()!] : this.inspected() ? [this.inspected()!] : [];
    this.api.turn(this.workspaceId, {
      content,
      mode: this.mode,
      focusObjectIds: focus.map((n) => n.id),
    }).subscribe({
      next: () => {
        this.draft = '';
        this.sending.set(false);
        this.reloadAll();
        queueMicrotask(() => {
          const el = this.chatBody?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      },
      error: () => this.sending.set(false),
    });
  }

  attach(item: DocumentItem) {
    this.api.attachDocument(this.workspaceId, item.id).subscribe(() => this.reloadAll());
  }

  runSearch() {
    this.searchOpen.set(true);
    this.api.search(this.workspaceId, this.searchQuery).subscribe((res) => {
      this.searchObjects.set(res.objects);
      this.searchDocs.set(res.documents);
    });
  }

  pickSearchObject(object: IdeaObject) {
    this.searchOpen.set(false);
    this.openObject(object);
    this.activeTab.set(0);
    queueMicrotask(() => this.canvas?.focus(object.id));
  }

  runReview() {
    this.api.enqueueJob(this.workspaceId, { jobClass: 'BATCH', mode: 'review' }).subscribe(() => this.reloadAll());
  }

  selectRight(tab: RightTab) {
    if (this.rightOpen() && this.rightTab() === tab) {
      this.rightOpen.set(false);
    } else {
      this.rightTab.set(tab);
      this.rightOpen.set(true);
    }
    this.persistChrome();
  }

  selectBottom(tab: BottomTab) {
    if (this.bottomOpen() && this.bottomTab() === tab) {
      this.bottomOpen.set(false);
      return;
    }
    this.bottomTab.set(tab);
    this.bottomOpen.set(true);
  }

  leftTitle(): string {
    switch (this.explorerTab()) {
      case 'documents':
        return 'Docs';
      case 'branches':
        return 'Branches';
      default:
        return 'Objects';
    }
  }

  rightTitle(): string {
    switch (this.rightTab()) {
      case 'insights':
        return 'Insights';
      case 'inspector':
        return 'Inspector';
      case 'outline':
        return 'Outline';
      default:
        return 'Chat';
    }
  }

  private pushShell() {
    const ws = this.workspace();
    if (!ws) return;
    const branch = this.branches().find((b) => b.id === this.activeBranchId())?.name ?? 'Mainstream';
    this.shell.bindWorkspace(ws.name, `${ws.persona} · ${branch}`, this.credits(), this.usageMinor());
  }

  persistChrome() {
    localStorage.setItem('ideate.chrome', JSON.stringify({
      leftDrawer: this.shell.leftDrawer(),
      rightOpen: this.rightOpen(),
      rightTab: this.rightTab(),
      leftWidth: this.shell.leftDrawerWidth(),
      rightWidth: this.shell.rightDrawerWidth(),
    }));
  }

  private restoreChrome() {
    try {
      const raw = localStorage.getItem('ideate.chrome');
      if (!raw) return;
      const v = JSON.parse(raw);
      if (typeof v.rightOpen === 'boolean') this.rightOpen.set(v.rightOpen);
      if (v.leftDrawer === 'objects' || v.leftDrawer === 'documents' || v.leftDrawer === 'branches' || v.leftDrawer === null) {
        this.shell.leftDrawer.set(v.leftDrawer);
      } else if (v.leftOpen === true && (v.leftTab === 'objects' || v.leftTab === 'documents' || v.leftTab === 'branches')) {
        this.shell.leftDrawer.set(v.leftTab);
      }
      if (v.rightTab === 'chat' || v.rightTab === 'insights' || v.rightTab === 'inspector' || v.rightTab === 'outline') {
        this.rightTab.set(v.rightTab);
      }
    } catch {
      /* ignore */
    }
  }
}
