import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MtButtonComponent, MtConfirm, MtIconComponent, MtProgressComponent, MtTooltipDirective } from '@ideate/ui';
import {
  IdeateApi,
  WorkspaceReport,
  WorkspaceReportVersion,
} from '@ideate/api-client';
import { renderMarkdown } from '../shared/render-markdown';
import { renderMermaidSvg, svgToPngDataUrl } from '../shared/render-mermaid';

@Component({
  selector: 'ideate-reports-tree',
  imports: [MtButtonComponent, MtIconComponent, MtProgressComponent, MtTooltipDirective],
  template: `
    <div class="docs-header">
      <div class="docs-toolbar" role="toolbar" aria-label="Report commands">
        <mt-button
          variant="outlined"
          size="sm"
          icon="play"
          label="Prepare"
          ariaLabel="Prepare report"
          [disabled]="!canPrepare()"
          (clicked)="prepare.emit()"
        />
        <mt-button
          variant="outlined"
          size="sm"
          icon="refresh"
          label="Update"
          ariaLabel="Update report"
          [disabled]="!canUpdate()"
          (clicked)="update.emit()"
        />
        <div class="toolbar-right">
          <div class="export-wrap">
            <mt-button
              variant="icon"
              size="sm"
              icon="download"
              ariaLabel="Export"
              mtTooltip="Export"
              [disabled]="!selectedVersion() || busy() || exporting()"
              (clicked)="exportOpen.set(!exportOpen())"
            />
            @if (exportOpen() && selectedVersion()) {
              <div class="export-menu" role="menu">
                <button type="button" (click)="doExport('pdf')">PDF</button>
                <button type="button" (click)="doExport('md')">Markdown</button>
                <button type="button" (click)="doExport('docx')">DOCX</button>
              </div>
            }
          </div>
          <mt-button
            variant="icon"
            size="sm"
            icon="recycle_bin"
            ariaLabel="Delete report"
            mtTooltip="Delete"
            [disabled]="!report() || busy()"
            (clicked)="confirmDelete()"
          />
        </div>
      </div>
    </div>
    @if (statusLine(); as line) {
      <p class="status" [attr.aria-busy]="busy()" aria-live="polite">
        @if (busy()) {
          <mt-progress size="sm" ariaLabel="Generating report" />
        }
        <span>{{ line }}</span>
      </p>
    }
    <div class="docs-tree" role="tree">
      @if (report(); as rpt) {
        <button
          type="button"
          class="row report"
          [class.row--active]="activeVersionId() === null"
          [class.row--busy]="busy()"
          role="treeitem"
          (click)="openLatest()"
        >
          @if (busy()) {
            <mt-progress size="sm" ariaLabel="Generating" />
          } @else {
            <mt-icon name="article" [size]="14" />
          }
          <span class="name">{{ rpt.title || 'Workspace report' }}</span>
          @if (rpt.currentVersion > 0) {
            <span class="role">v{{ rpt.currentVersion }}</span>
          }
        </button>
        @for (ver of versions(); track ver.id) {
          <button
            type="button"
            class="row version"
            [class.row--active]="activeVersionId() === ver.id"
            role="treeitem"
            (click)="openVersion(ver)"
          >
            <span class="twist"></span>
            <mt-icon name="description" [size]="12" />
            <span class="name">v{{ ver.version }} · {{ ver.title || 'Workspace report' }}.md</span>
          </button>
        }
      } @else {
        <p class="muted">No report yet. Prepare one from the graph as it stands now.</p>
      }
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .docs-header { flex: none; border-bottom: 1px solid var(--surface-border); padding: 0.2rem 0.35rem; }
    .docs-toolbar { display: flex; flex-wrap: nowrap; align-items: center; gap: 0.25rem; min-height: 1.75rem; }
    .toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 0.1rem; }
    .export-wrap { position: relative; }
    .export-menu {
      position: absolute;
      top: 100%;
      right: 0;
      left: auto;
      z-index: 8;
      min-width: 7.5rem;
      padding: 0.2rem;
      background: var(--surface-card, var(--mt-surface-card));
      border: 1px solid var(--surface-border);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
    .export-menu button {
      display: block;
      width: 100%;
      text-align: left;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.75rem;
      padding: 0.3rem 0.45rem;
      cursor: pointer;
    }
    .export-menu button:hover { background: var(--surface-hover); }
    .status, .muted { margin: 0.35rem 0.5rem; font-size: 0.72rem; color: var(--mt-text-muted); }
    .status { display: flex; align-items: center; gap: 0.4rem; }
    .row--busy .name { font-style: italic; }
    .docs-tree { flex: 1; min-height: 0; overflow: auto; padding: 0.25rem 0; }
    .row {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      width: 100%;
      min-height: 1.6rem;
      padding: 0.15rem 0.45rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .row:hover { background: var(--surface-hover); }
    .row--active {
      background: var(--mt-sidebar-list-selected-bg, var(--mt-selection-bg));
      color: var(--mt-primary, var(--primary-color));
      box-shadow: inset 3px 0 0 var(--mt-selection-border, var(--primary-color));
    }
    .version { padding-left: 1.45rem; }
    .twist { width: 1rem; flex: 0 0 1rem; }
    .name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.78rem;
    }
    .role {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--mt-text-muted);
    }
  `,
})
export class ReportsTreeComponent {
  private readonly api = inject(IdeateApi);
  private readonly confirm = inject(MtConfirm);

  readonly workspaceId = input.required<string>();
  readonly report = input<WorkspaceReport | null>(null);
  readonly versions = input<WorkspaceReportVersion[]>([]);
  readonly activeVersionId = input<string | null>(null);
  readonly jobStatus = input<string | null>(null);
  readonly prepare = output<void>();
  readonly update = output<void>();
  readonly deleted = output<void>();
  readonly open = output<WorkspaceReportVersion | null>();
  readonly select = output<WorkspaceReportVersion | null>();
  readonly exported = output<void>();

  readonly exportOpen = signal(false);
  readonly exporting = signal(false);
  readonly selectedId = signal<string | null>(null);

  readonly busy = computed(() => {
    const s = this.report()?.status;
    return s === 'preparing' || s === 'updating';
  });

  readonly selectedVersion = computed(() => {
    const versions = this.versions();
    const id = this.selectedId() ?? this.activeVersionId();
    if (id) {
      const found = versions.find((v) => v.id === id);
      if (found) return found;
    }
    return versions.length ? versions[versions.length - 1] : null;
  });

  readonly statusLine = computed(() => {
    const rpt = this.report();
    if (!rpt) return '';
    if (rpt.status === 'preparing' || rpt.status === 'updating') {
      const job = this.jobStatus();
      if (job === 'queued') return 'Queued… generating report from the current graph.';
      if (rpt.status === 'updating') return 'Generating an updated report…';
      return 'Generating report…';
    }
    if (rpt.status === 'failed') return rpt.error ? `Last run failed: ${rpt.error}` : 'Last run failed.';
    return '';
  });

  canUpdate(): boolean {
    const rpt = this.report();
    if (!rpt || this.busy()) return false;
    return rpt.status === 'ready' || (rpt.status === 'failed' && rpt.currentVersion > 0);
  }

  canPrepare(): boolean {
    if (this.busy()) return false;
    const rpt = this.report();
    return !rpt || (rpt.status === 'failed' && rpt.currentVersion === 0);
  }

  openVersion(ver: WorkspaceReportVersion) {
    this.selectedId.set(ver.id);
    this.select.emit(ver);
    this.open.emit(ver);
  }

  openLatest() {
    this.selectedId.set(null);
    this.select.emit(null);
    const versions = this.versions();
    this.open.emit(versions.length ? versions[versions.length - 1] : null);
  }

  confirmDelete() {
    const rpt = this.report();
    if (!rpt) return;
    this.confirm.confirm({
      header: 'Delete report?',
      message: 'This removes the report and its versions. Graph cards stay.',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => {
        this.api.deleteReport(this.workspaceId(), rpt.id).subscribe(() => {
          this.deleted.emit();
        });
      },
    });
  }

  async doExport(format: 'md' | 'pdf' | 'docx') {
    const rpt = this.report();
    const ver = this.selectedVersion();
    if (!rpt || !ver) return;
    this.exportOpen.set(false);
    this.exporting.set(true);
    try {
      const diagrams = format === 'md' ? [] : await this.diagramPngs(ver.body);
      this.api.exportReport(this.workspaceId(), rpt.id, ver.version, { format, diagrams }).subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) return;
          const name = this.filenameFrom(res.headers.get('content-disposition'), ver.title, ver.version, format);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          a.click();
          URL.revokeObjectURL(url);
          this.exporting.set(false);
          this.exported.emit();
        },
        error: () => this.exporting.set(false),
      });
    } catch {
      this.exporting.set(false);
    }
  }

  private async diagramPngs(body: string): Promise<string[]> {
    const parsed = renderMarkdown(body, { diagrams: true });
    const out: string[] = [];
    for (const source of parsed.diagrams) {
      try {
        const svg = await renderMermaidSvg(source, false);
        out.push(await svgToPngDataUrl(svg));
      } catch {
        out.push('');
      }
    }
    return out;
  }

  private filenameFrom(header: string | null, title: string, version: number, format: string): string {
    const match = header?.match(/filename\*?=(?:UTF-8'')?["']?([^";]+)/i);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
    const base = (title || 'report').replace(/[^a-zA-Z0-9._-]+/g, '-');
    return `${base}-v${version}.${format === 'markdown' ? 'md' : format}`;
  }
}
