import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin, of } from 'rxjs';
import { MtButtonComponent, MtConfirm, MtDialogComponent, MtIconComponent } from '@ideate/ui';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_FILES,
  Attachment,
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
  WorkspaceReport,
  WorkspaceReportVersion,
  lookupLabel,
} from '@ideate/api-client';
import { ShellContextService } from '../core/shell/shell-context.service';
import { DrawerResizeComponent } from '../core/nav/drawer-resize.component';
import { GraphCanvasComponent } from './graph-canvas.component';
import { ObjectPageComponent } from './object-page.component';
import { DocsTreeComponent } from './docs-tree.component';
import { ObjectsTreeComponent } from './objects-tree.component';
import { BranchesTreeComponent } from './branches-tree.component';
import { ReportsTreeComponent } from './reports-tree.component';
import { ReportPageComponent } from './report-page.component';
import { MdViewComponent } from '../shared/md-view.component';
import { AttachmentListComponent } from '../shared/attachment-list.component';
import { ancestorPath } from './chat-context';
import { SettingsPageComponent } from './settings-page.component';
import { TypeGlyphComponent } from '../shared/type-glyph.component';
import { AttachmentStore } from './attachment.store';

type EditorTab =
  | { kind: 'graph' }
  | { kind: 'object'; object: IdeaObject }
  | { kind: 'document'; item: DocumentItem }
  | { kind: 'attachment'; attachment: Attachment }
  | { kind: 'report'; reportId: string; version: WorkspaceReportVersion | null }
  | { kind: 'settings' };

type LeftTab = 'objects' | 'documents' | 'branches' | 'reports';
type RightTab = 'chat' | 'insights' | 'inspector' | 'outline';
type BottomTab = 'timeline' | 'review' | 'jobs' | 'problems';

@Component({
  selector: 'ideate-workspace-shell',
  imports: [FormsModule, MtButtonComponent, MtDialogComponent, MtIconComponent, GraphCanvasComponent, ObjectPageComponent, ObjectsTreeComponent, DocsTreeComponent, BranchesTreeComponent, ReportsTreeComponent, ReportPageComponent, DrawerResizeComponent, MdViewComponent, SettingsPageComponent, TypeGlyphComponent, AttachmentListComponent],
  templateUrl: './workspace-shell.component.html',
  styleUrl: './workspace-shell.component.scss',
})
export class WorkspaceShellComponent implements OnInit, OnDestroy {
  private readonly api = inject(IdeateApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(MtConfirm);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fileObjectUrls = new Map<string, string>();
  readonly filePreview = signal<Record<string, { src: SafeResourceUrl; imageSrc: SafeUrl; kind: 'image' | 'text' | 'pdf' | 'embed'; text: string | null }>>({});
  readonly shell = inject(ShellContextService);
  readonly newNodeOpen = signal(false);
  readonly newNodeParent = signal<IdeaObject | null>(null);
  readonly newNodeType = signal('thought');
  readonly newNodeTitle = signal('');
  readonly attachments = inject(AttachmentStore);
  private readonly subs = new Subscription();

  @ViewChild('canvas') canvas?: GraphCanvasComponent;
  @ViewChild('chatBody') chatBody?: ElementRef<HTMLElement>;

  workspace = signal<Workspace | null>(null);
  graph = signal<GraphSnapshot>({ nodes: [], edges: [] });
  transcript = signal<TranscriptMessage[]>([]);
  documents = signal<DocumentItem[]>([]);
  folders = signal<DocumentFolder[]>([]);
  branches = signal<WorkspaceBranch[]>([]);
  report = signal<WorkspaceReport | null>(null);
  reportVersions = signal<WorkspaceReportVersion[]>([]);
  activeReportVersionId = signal<string | null>(null);
  reportJobStatus = signal<string | null>(null);
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
  draft = '';
  mode = 'explore';
  modes = MODES;
  types = OBJECT_TYPES;
  readonly lookupLabel = lookupLabel;
  readonly acceptFiles = ATTACHMENT_ACCEPT;
  sending = signal(false);
  pendingFiles = signal<File[]>([]);
  workspaceId = '';
  private objectRowTapAt = 0;
  private objectRowTapId = '';
  private awaitingJobId: string | null = null;
  private awaitingReportJobId: string | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private reportPollTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.subs.add(this.shell.settingsClick.subscribe(() => this.toggleSettings()));
  }

  explorerOpen(): boolean {
    return this.shell.explorerDrawerOpen();
  }

  explorerTab(): LeftTab {
    const d = this.shell.leftDrawer();
    return d === 'documents' || d === 'branches' || d === 'reports' ? d : 'objects';
  }

  ngOnDestroy() {
    this.clearPoll();
    this.clearReportPoll();
    this.subs.unsubscribe();
    this.shell.settingsOpen.set(false);
    this.shell.clearWorkspace();
    this.attachments.clear();
    for (const url of this.fileObjectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.fileObjectUrls.clear();
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
    this.loadReport();
    this.attachments.load(this.workspaceId);
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
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        calls: u.calls,
      });
      this.usageMinor.set(u.estimatedCostMinorInr ?? 0);
      this.pushShell();
    });
  }

  currentTab(): EditorTab | undefined {
    return this.tabs()[this.activeTab()];
  }

  tabKey(tab: EditorTab): string {
    if (tab.kind === 'graph') return 'graph';
    if (tab.kind === 'settings') return 'settings';
    if (tab.kind === 'object') return 'obj-' + tab.object.id;
    if (tab.kind === 'attachment') return 'att-' + tab.attachment.id;
    if (tab.kind === 'report') return 'rpt-' + tab.reportId;
    return 'doc-' + tab.item.id;
  }

  tabLabel(tab: EditorTab): string {
    if (tab.kind === 'graph') return 'Graph';
    if (tab.kind === 'settings') return 'Settings';
    if (tab.kind === 'object') return tab.object.displayId;
    if (tab.kind === 'attachment') return tab.attachment.originalName;
    if (tab.kind === 'report') return this.reportFileName(tab.version);
    return tab.item.name;
  }

  reportFileName(version: WorkspaceReportVersion | null): string {
    const title = version?.title || this.report()?.title || 'Workspace report';
    return title.toLowerCase().endsWith('.md') ? title : `${title}.md`;
  }

  reportGenerating(): boolean {
    const status = this.report()?.status;
    return status === 'preparing' || status === 'updating';
  }

  selectEditorTab(i: number) {
    this.activeTab.set(i);
    this.syncSettingsNav();
  }

  toggleSettings() {
    const tabs = this.tabs();
    const idx = tabs.findIndex((t) => t.kind === 'settings');
    if (idx >= 0 && this.activeTab() === idx) {
      this.closeTab(idx);
      return;
    }
    if (idx >= 0) {
      this.activeTab.set(idx);
      this.syncSettingsNav();
      return;
    }
    this.tabs.set([...tabs, { kind: 'settings' }]);
    this.activeTab.set(this.tabs().length - 1);
    this.syncSettingsNav();
  }

  private loadAttachmentPreview(item: Attachment) {
    this.attachments.content(item.id).subscribe((blob) => {
      const mime = this.mimeFor(item, blob);
      const typed = blob.type === mime ? blob : new Blob([blob], { type: mime });
      const kind = this.previewKind(item, mime);
      const url = URL.createObjectURL(typed);
      const previous = this.fileObjectUrls.get(item.id);
      if (previous) URL.revokeObjectURL(previous);
      this.fileObjectUrls.set(item.id, url);
      const finish = (text: string | null) => {
        this.filePreview.update((map) => ({
          ...map,
          [item.id]: {
            src: this.sanitizer.bypassSecurityTrustResourceUrl(url),
            imageSrc: this.sanitizer.bypassSecurityTrustUrl(url),
            kind,
            text,
          },
        }));
      };
      if (kind === 'text') {
        typed.text().then(finish);
      } else {
        finish(null);
      }
    });
  }

  private previewKind(item: Attachment, mime: string): 'image' | 'text' | 'pdf' | 'embed' {
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf' || item.originalName.toLowerCase().endsWith('.pdf')) return 'pdf';
    if (mime.startsWith('text/') || /\.(txt|md|csv)$/i.test(item.originalName)) return 'text';
    return 'embed';
  }

  private mimeFor(item: Attachment, blob: Blob): string {
    const name = item.originalName.toLowerCase();
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.gif')) return 'image/gif';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.txt')) return 'text/plain';
    if (name.endsWith('.md')) return 'text/markdown';
    if (name.endsWith('.csv')) return 'text/csv';
    if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (name.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    return item.contentType || blob.type || 'application/octet-stream';
  }

  private dropAttachmentPreview(id: string) {
    const url = this.fileObjectUrls.get(id);
    if (url) URL.revokeObjectURL(url);
    this.fileObjectUrls.delete(id);
    this.filePreview.update((map) => {
      const next = { ...map };
      delete next[id];
      return next;
    });
  }

  private syncSettingsNav() {
    this.shell.settingsOpen.set(this.currentTab()?.kind === 'settings');
  }

  openObject(object: IdeaObject) {
    const tabs = this.tabs();
    const idx = tabs.findIndex((t) => t.kind === 'object' && t.object.id === object.id);
    if (idx >= 0) {
      this.activeTab.set(idx);
      this.syncSettingsNav();
      return;
    }
    this.tabs.set([...tabs, { kind: 'object', object }]);
    this.activeTab.set(this.tabs().length - 1);
    this.syncSettingsNav();
  }

  openAttachmentTab(item: Attachment) {
    const tabs = this.tabs();
    const idx = tabs.findIndex((t) => t.kind === 'attachment' && t.attachment.id === item.id);
    if (idx >= 0) {
      this.activeTab.set(idx);
      this.syncSettingsNav();
      return;
    }
    this.tabs.set([...tabs, { kind: 'attachment', attachment: item }]);
    this.activeTab.set(this.tabs().length - 1);
    this.syncSettingsNav();
    this.loadAttachmentPreview(item);
  }

  openDocument(item: DocumentItem) {
    const tabs = this.tabs();
    const idx = tabs.findIndex((t) => t.kind === 'document' && t.item.id === item.id);
    if (idx >= 0) {
      this.activeTab.set(idx);
      this.syncSettingsNav();
      return;
    }
    this.tabs.set([...tabs, { kind: 'document', item }]);
    this.activeTab.set(this.tabs().length - 1);
    this.syncSettingsNav();
  }

  loadReport(opts?: { open?: boolean }) {
    this.api.getReport(this.workspaceId, this.activeBranchId() ?? undefined).subscribe((bundle) => {
      const report = bundle.report ?? null;
      const versions = bundle.versions ?? [];
      this.report.set(report);
      this.reportVersions.set(versions);
      const latest = versions.length ? versions[versions.length - 1] : null;
      const tabs = this.tabs().map((tab) => {
        if (tab.kind !== 'report' || !report) return tab;
        if (tab.reportId !== report.id && tab.reportId !== 'pending') return tab;
        const keep = tab.version ? versions.find((v) => v.id === tab.version?.id) : null;
        return { kind: 'report' as const, reportId: report.id, version: keep ?? latest };
      });
      this.tabs.set(tabs);
      if (latest && !this.activeReportVersionId()) {
        this.activeReportVersionId.set(latest.id);
      }
      if (opts?.open && report) {
        this.openReportTab(report.id, latest);
      }
    });
  }

  prepareReport() {
    this.markReportBusy('preparing');
    this.api.prepareReport(this.workspaceId, this.activeBranchId() ?? undefined).subscribe({
      next: (job) => {
        this.reportJobStatus.set(job.status);
        this.api.jobs(this.workspaceId).subscribe((j) => this.jobs.set(j));
        this.pollReportJob(job.id);
        this.loadReport({ open: true });
      },
    });
  }

  updateReport() {
    this.markReportBusy('updating');
    this.api.updateReport(this.workspaceId, this.activeBranchId() ?? undefined).subscribe({
      next: (job) => {
        this.reportJobStatus.set(job.status);
        this.api.jobs(this.workspaceId).subscribe((j) => this.jobs.set(j));
        this.pollReportJob(job.id);
        this.loadReport({ open: true });
      },
    });
  }

  private markReportBusy(status: 'preparing' | 'updating') {
    this.reportJobStatus.set('queued');
    const current = this.report();
    const latest = this.reportVersions().length
      ? this.reportVersions()[this.reportVersions().length - 1]
      : null;
    if (current) {
      this.report.set({ ...current, status, error: null });
      this.openReportTab(current.id, latest);
      return;
    }
    this.report.set({
      id: 'pending',
      workspaceId: this.workspaceId,
      branchId: this.activeBranchId() ?? '',
      status,
      currentVersion: 0,
      title: 'Workspace report',
      createdAt: '',
      updatedAt: '',
    });
    this.openReportTab('pending', null);
  }

  openReportFromTree(version: WorkspaceReportVersion | null) {
    const report = this.report();
    if (!report) return;
    this.openReportTab(report.id, version);
  }

  openReportVersion(version: WorkspaceReportVersion) {
    this.openReportTab(version.reportId, version);
  }

  openReportTab(reportId: string, version: WorkspaceReportVersion | null) {
    this.activeReportVersionId.set(version?.id ?? null);
    const tabs = this.tabs();
    const idx = tabs.findIndex(
      (t) => t.kind === 'report' && (t.reportId === reportId || t.reportId === 'pending' || reportId === 'pending'),
    );
    const next: EditorTab = { kind: 'report', reportId, version };
    if (idx >= 0) {
      const copy = [...tabs];
      copy[idx] = next;
      this.tabs.set(copy);
      this.activeTab.set(idx);
      this.syncSettingsNav();
      return;
    }
    this.tabs.set([...tabs, next]);
    this.activeTab.set(this.tabs().length - 1);
    this.syncSettingsNav();
  }

  private pollReportJob(jobId: string) {
    this.clearReportPoll();
    this.awaitingReportJobId = jobId;
    const started = Date.now();
    const tick = () => {
      if (this.awaitingReportJobId !== jobId) {
        return;
      }
      this.api.getJob(this.workspaceId, jobId).subscribe({
        next: (job) => {
          this.reportJobStatus.set(job.status);
          if (job.status === 'applied' || job.status === 'failed') {
            this.awaitingReportJobId = null;
            this.clearReportPoll();
            this.loadReport({ open: true });
            this.api.jobs(this.workspaceId).subscribe((j) => this.jobs.set(j));
            if (job.status === 'applied') {
              this.reportJobStatus.set(null);
            }
            return;
          }
          if (Date.now() - started > 240000) {
            this.awaitingReportJobId = null;
            this.clearReportPoll();
            this.loadReport({ open: true });
            return;
          }
          this.reportPollTimer = setTimeout(tick, 900);
        },
        error: () => {
          this.reportPollTimer = setTimeout(tick, 1500);
        },
      });
    };
    this.reportPollTimer = setTimeout(tick, 400);
  }

  private clearReportPoll() {
    if (this.reportPollTimer != null) {
      clearTimeout(this.reportPollTimer);
      this.reportPollTimer = null;
    }
  }

  closeTab(i: number) {
    const closing = this.tabs()[i];
    if (closing?.kind === 'attachment') {
      this.dropAttachmentPreview(closing.attachment.id);
    }
    const next = this.tabs().filter((_, idx) => idx !== i);
    this.tabs.set(next);
    this.activeTab.set(Math.min(this.activeTab(), Math.max(0, next.length - 1)));
    this.syncSettingsNav();
  }

  focusObject(object: IdeaObject) {
    this.activeTab.set(0);
    this.syncSettingsNav();
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
    this.newNodeParent.set(object);
    this.newNodeType.set('thought');
    this.newNodeTitle.set('');
    this.newNodeOpen.set(true);
  }

  closeNewNode() {
    this.newNodeOpen.set(false);
    this.newNodeParent.set(null);
  }

  submitNewNode() {
    const parent = this.newNodeParent();
    const type = this.newNodeType().trim();
    const title = this.newNodeTitle().trim();
    if (!parent || !type || !title) {
      return;
    }
    this.closeNewNode();
    this.api.newNode(this.workspaceId, parent.id, { type, title }).subscribe(() => this.reloadAll());
  }

  promptMenu(object: IdeaObject) {
    this.confirm.confirm({
      header: 'Delete card?',
      message: `Delete ${object.displayId} “${(object.title || 'Untitled').trim()}”? This cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => {
        this.api.deleteObject(this.workspaceId, object.id).subscribe(() => {
          const idx = this.tabs().findIndex((t) => t.kind === 'object' && t.object.id === object.id);
          if (idx >= 0) {
            this.closeTab(idx);
          }
          this.reloadAll();
        });
      },
    });
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

  activeBranchName(): string {
    return this.branches().find((b) => b.id === this.activeBranchId())?.name ?? 'Mainstream';
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

  visibleChat(): TranscriptMessage[] {
    return this.transcript().filter((m) => !this.isPlaceholderAssistant(m));
  }

  waitingForReply(): boolean {
    return this.sending() || this.awaitingJobId != null;
  }

  chatText(m: TranscriptMessage): string {
    const text = (m.content ?? '').trim();
    if (m.role === 'assistant') {
      return this.cleanAssistantChat(text);
    }
    return text;
  }

  private isPlaceholderAssistant(m: TranscriptMessage): boolean {
    if (m.id.startsWith('local-ai-')) {
      return true;
    }
    if (m.role !== 'assistant') {
      return false;
    }
    const text = (m.content ?? '').trim();
    return /I\/O error|Read timed out|Connection refused|model was unreachable|UnknownHostException|didn’t respond just now|didn't respond just now|try sending again|something went wrong finishing/i.test(text);
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
    this.activeReportVersionId.set(null);
    this.reloadAll();
  }

  onReportDeleted() {
    this.report.set(null);
    this.reportVersions.set([]);
    this.activeReportVersionId.set(null);
    this.reportJobStatus.set(null);
    const next = this.tabs().filter((t) => t.kind !== 'report');
    this.tabs.set(next);
    this.activeTab.set(Math.min(this.activeTab(), Math.max(0, next.length - 1)));
    this.syncSettingsNav();
  }

  send() {
    const content = this.draft.trim();
    const files = this.pendingFiles();
    if ((!content && files.length === 0) || this.sending()) {
      return;
    }
    const path = this.chatFrom() ? this.chatPath() : [];
    const leaf = this.chatFrom();
    const focus = path.length ? [...path] : leaf ? [leaf] : [];
    if (leaf && focus.length && focus[focus.length - 1]?.id !== leaf.id) {
      focus.push(leaf);
    }
    const now = new Date().toISOString();
    const localUser: TranscriptMessage = {
      id: 'local-user-' + now,
      workspaceId: this.workspaceId,
      branchId: this.activeBranchId() ?? '',
      role: 'user',
      content,
      mode: this.mode,
      createdAt: now,
    };
    this.transcript.set([...this.transcript(), localUser]);
    this.awaitingJobId = 'pending';
    this.draft = '';
    this.pendingFiles.set([]);
    this.sending.set(true);
    this.scrollChat();
    const uploads$ = files.length
      ? forkJoin(files.map((file) => this.attachments.upload(file)))
      : of([] as Attachment[]);
    uploads$.subscribe({
      next: (uploaded) => {
        this.api.turn(this.workspaceId, {
          content,
          mode: this.mode,
          focusObjectIds: focus.map((n) => n.id),
          attachmentIds: uploaded.map((a) => a.id),
        }).subscribe({
          next: (res) => {
            this.sending.set(false);
            if (res.userMessageId) {
              this.transcript.set(this.transcript().map((m) => (
                m.id === localUser.id ? { ...m, id: res.userMessageId! } : m
              )));
            }
            this.attachments.load(this.workspaceId);
            if (res.jobId) {
              this.awaitingJobId = res.jobId;
              this.pollJob(res.jobId);
            } else {
              this.awaitingJobId = null;
              this.refreshChat();
            }
          },
          error: () => {
            this.sending.set(false);
            this.awaitingJobId = null;
            this.transcript.set(this.transcript().filter((m) => m.id !== localUser.id));
            this.draft = content;
            this.pendingFiles.set(files);
            uploaded.forEach((a) => this.attachments.remove(a.id).subscribe());
          },
        });
      },
      error: () => {
        this.sending.set(false);
        this.awaitingJobId = null;
        this.transcript.set(this.transcript().filter((m) => m.id !== localUser.id));
        this.draft = content;
        this.pendingFiles.set(files);
      },
    });
  }

  pickChatFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    input.value = '';
    const next = [...this.pendingFiles()];
    for (const file of picked) {
      if (file.size > ATTACHMENT_MAX_BYTES) {
        continue;
      }
      if (next.length >= ATTACHMENT_MAX_FILES) {
        break;
      }
      next.push(file);
    }
    this.pendingFiles.set(next);
  }

  removePending(index: number) {
    this.pendingFiles.set(this.pendingFiles().filter((_, i) => i !== index));
  }

  messageAttachments(messageId: string): Attachment[] {
    return this.attachments.forMessage(messageId);
  }

  inspectorAttachments(): Attachment[] {
    const obj = this.inspected();
    return obj ? this.attachments.forObject(obj.id) : [];
  }

  addInspectorFiles(files: File[]) {
    const obj = this.inspected();
    if (!obj) {
      return;
    }
    for (const file of files) {
      this.attachments.upload(file, obj.id).subscribe();
    }
  }

  removeInspectorFile(item: Attachment) {
    this.attachments.remove(item.id).subscribe();
  }

  canSend(): boolean {
    return !this.sending() && !!(this.draft.trim() || this.pendingFiles().length);
  }

  private pollJob(jobId: string) {
    this.clearPoll();
    const started = Date.now();
    const tick = () => {
      if (this.awaitingJobId !== jobId) {
        return;
      }
      this.api.getJob(this.workspaceId, jobId).subscribe({
        next: (job) => {
          if (job.status === 'applied') {
            this.finishWhenReplied();
            return;
          }
          if (Date.now() - started > 180000) {
            this.awaitingJobId = null;
            this.clearPoll();
            this.refreshChat();
            return;
          }
          if (job.status === 'failed') {
            this.awaitingJobId = null;
            this.clearPoll();
            this.refreshChat();
            return;
          }
          this.pollTimer = setTimeout(tick, 700);
        },
        error: () => {
          this.refreshChat();
          this.pollTimer = setTimeout(tick, 1500);
        },
      });
    };
    this.pollTimer = setTimeout(tick, 400);
  }

  private finishWhenReplied() {
    this.api.transcript(this.workspaceId, this.activeBranchId() ?? undefined).subscribe((t) => {
      this.transcript.set(t);
      if (this.hasUsableReply()) {
        this.awaitingJobId = null;
        this.clearPoll();
        this.reloadAll(() => this.scrollChat());
        return;
      }
      this.scrollChat();
      this.pollTimer = setTimeout(() => {
        if (this.awaitingJobId) {
          this.pollJob(this.awaitingJobId);
        }
      }, 800);
    });
  }

  private hasUsableReply(): boolean {
    const msgs = this.visibleChat();
    return msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant';
  }

  private refreshChat() {
    this.api.transcript(this.workspaceId, this.activeBranchId() ?? undefined).subscribe((t) => {
      this.transcript.set(t);
      this.scrollChat();
    });
  }

  private clearPoll() {
    if (this.pollTimer != null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private scrollChat() {
    queueMicrotask(() => {
      const el = this.chatBody?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
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
      case 'reports':
        return 'Reports';
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
      if (v.leftDrawer === 'objects' || v.leftDrawer === 'documents' || v.leftDrawer === 'branches' || v.leftDrawer === 'reports' || v.leftDrawer === null) {
        this.shell.leftDrawer.set(v.leftDrawer);
      } else if (v.leftOpen === true && (v.leftTab === 'objects' || v.leftTab === 'documents' || v.leftTab === 'branches' || v.leftTab === 'reports')) {
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
