import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MtButtonComponent, MtFieldComponent, MtTableComponent } from '@ideate/ui';
import { IdeateApi, PERSONAS, Persona, WorkspaceSummary } from '@ideate/api-client';
import { ShellContextService } from '../core/shell/shell-context.service';

@Component({
  selector: 'ideate-home',
  imports: [FormsModule, MtButtonComponent, MtFieldComponent, MtTableComponent],
  template: `
    <div class="dash">
      <header class="hero">
        <div>
          <h1>Workspace dashboard</h1>
          <p>Create, open, and manage every workspace from this page.</p>
        </div>
        <div class="hero-actions">
          <mt-button size="sm" variant="text" icon="refresh" [label]="'Refresh'" (clicked)="reload()" />
          <mt-button size="sm" icon="add" [label]="'New workspace'" (clicked)="creating.set(true)" />
        </div>
      </header>

      @if (error()) {
        <p class="err">{{ error() }}</p>
      }

      @if (creating()) {
        <section class="widget create">
          <h2>New workspace</h2>
          <div class="create-grid">
            <mt-field label="Name" placeholder="Prism projector…" [(ngModel)]="name" />
            <label class="persona">
              <span>Persona</span>
              <select [(ngModel)]="persona">
                <option value="" disabled>Select a persona</option>
                @for (p of personas; track p) {
                  <option [value]="p">{{ p }}</option>
                }
              </select>
            </label>
          </div>
          <div class="actions">
            <mt-button [label]="'Create'" [disabled]="!name.trim() || !persona || busy()" (clicked)="create()" />
            <mt-button variant="text" [label]="'Cancel'" (clicked)="creating.set(false)" />
          </div>
        </section>
      }

      <section class="widgets" aria-label="Dashboard widgets">
        <article class="widget">
          <h2>Overview</h2>
          <ul class="kv">
            <li><button type="button" (click)="filter.set('all')"><span>Workspaces</span><strong>{{ rows().length }}</strong></button></li>
            <li><span>Objects</span><strong>{{ totalObjects() }}</strong></li>
            <li><span>Open problems</span><strong [class.alert]="openProblems() > 0">{{ openProblems() }}</strong></li>
            <li><span>Usage</span><strong>{{ totalUsage() }}</strong></li>
          </ul>
        </article>
        <article class="widget">
          <h2>By persona</h2>
          <ul class="kv">
            @for (p of personas; track p) {
              <li>
                <button type="button" [class.active]="filter() === p" (click)="filter.set(p)">
                  <span>{{ p }}</span><strong>{{ countByPersona()[p] }}</strong>
                </button>
              </li>
            }
          </ul>
        </article>
        <article class="widget">
          <h2>Recent</h2>
          @if (recent().length === 0) {
            <p class="muted">Nothing recent yet.</p>
          }
          <ul class="list">
            @for (ws of recent(); track ws.id) {
              <li>
                <button type="button" class="link" (click)="open(ws)">{{ ws.name }}</button>
                <span class="meta">{{ ws.persona }} · {{ statusOf(ws) }}</span>
              </li>
            }
          </ul>
        </article>
        <article class="widget">
          <h2>Needs attention</h2>
          @if (attention().length === 0) {
            <p class="muted">No open problems.</p>
          }
          <ul class="list">
            @for (ws of attention(); track ws.id) {
              <li>
                <button type="button" class="link" (click)="open(ws)">{{ ws.name }}</button>
                <span class="meta">{{ ws.problemCount }} problems</span>
              </li>
            }
          </ul>
        </article>
      </section>

      <section class="table-section">
        <div class="section-head">
          <h2>{{ filter() === 'all' ? 'All workspaces' : filter() + ' workspaces' }}</h2>
          @if (filter() !== 'all') {
            <mt-button size="sm" variant="text" [label]="'Clear filter'" (clicked)="filter.set('all')" />
          }
        </div>
        <mt-table [columns]="columns" [value]="tableRows()" [actions]="true" dataKey="id" emptyMessage="No workspaces yet. Use New workspace to create one.">
          <ng-template #actions let-row>
            <div class="row-actions">
              <mt-button size="sm" [label]="'Open'" (clicked)="openById(row['id'])" />
              <mt-button size="sm" variant="text" icon="delete" [label]="'Delete'" (clicked)="removeById(row['id'])" />
            </div>
          </ng-template>
        </mt-table>
      </section>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; overflow: auto; }
    .dash { max-width: 72rem; margin: 0 auto; padding: 0.7rem 0.85rem 1.25rem; }
    .hero { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.55rem; }
    .hero-actions { display: flex; gap: 0.3rem; align-items: center; }
    h1, h2 { margin: 0 0 0.2rem; }
    h1 { font-size: var(--mt-fs-lg); font-weight: 700; }
    h2 { font-size: var(--mt-fs-sm); font-weight: 700; }
    p { margin: 0; color: var(--mt-text-muted); font-size: var(--mt-fs-sm); }
    .err { color: var(--mt-severity-danger); margin-bottom: 0.45rem; font-size: var(--mt-fs-sm); }
    .muted { font-size: var(--mt-fs-sm); }
    .widgets { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.4rem; margin-bottom: 0.7rem; }
    @media (max-width: 56rem) { .widgets { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .widget {
      border: 1px solid var(--surface-border); background: var(--mt-surface-card);
      border-radius: var(--mt-panel-border-radius, 1px); padding: 0.4rem 0.5rem;
    }
    .create { margin-bottom: 1rem; }
    .create-grid { display: grid; grid-template-columns: 1fr 12rem; gap: 0.5rem; margin: 0.4rem 0; }
    .persona { display: flex; flex-direction: column; gap: 0.2rem; }
    .persona span { font-size: var(--mt-fs-sm); color: var(--mt-text-muted); }
    select {
      width: 100%; background: var(--mt-input-bg); border: 1px solid var(--mt-surface-border);
      color: inherit; padding: var(--mt-input-padding); font-size: var(--mt-fs);
      min-height: var(--mt-control-height); box-sizing: border-box;
    }
    .kv, .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; }
    .kv li, .kv button { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .kv button, .link {
      width: 100%; text-align: left; background: none; border: 0; color: inherit; cursor: pointer;
      padding: 0.15rem 0; font: inherit;
    }
    .kv button:hover, .link:hover { color: var(--mt-primary); }
    .kv button.active { color: var(--mt-primary); font-weight: 650; }
    .kv span, .meta { font-size: var(--mt-fs-sm); color: var(--mt-text-muted); text-transform: capitalize; }
    .kv strong { font-size: var(--mt-fs); }
    .alert { color: var(--mt-severity-danger, #b91c1c); }
    .list li { display: flex; flex-direction: column; padding: 0.2rem 0; border-bottom: 1px solid var(--surface-border); }
    .list li:last-child { border-bottom: 0; }
    .actions, .row-actions { display: flex; gap: 0.3rem; }
    .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .table-section { min-width: 0; }
  `,
})
export class HomeComponent {
  private readonly api = inject(IdeateApi);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellContextService);
  readonly personas = PERSONAS;
  readonly rows = signal<WorkspaceSummary[]>([]);
  readonly error = signal('');
  readonly creating = signal(false);
  readonly filter = signal<'all' | Persona>('all');
  readonly busy = signal(false);
  name = '';
  persona = '';
  readonly columns = [
    { field: 'name', header: 'Name' },
    { field: 'persona', header: 'Persona', width: '7rem' },
    { field: 'status', header: 'Status', width: '7rem' },
    { field: 'objects', header: 'Objects', width: '5.5rem' },
    { field: 'branches', header: 'Branches', width: '5.5rem' },
    { field: 'docs', header: 'Docs', width: '4.5rem' },
    { field: 'usage', header: 'Usage', width: '5rem' },
    { field: 'updated', header: 'Updated', width: '12rem' },
  ];

  readonly countByPersona = computed(() => {
    const counts = Object.fromEntries(PERSONAS.map((p) => [p, 0])) as Record<Persona, number>;
    for (const ws of this.rows()) counts[ws.persona] += 1;
    return counts;
  });
  readonly recent = computed(() => this.rows().slice(0, 5));
  readonly attention = computed(() => this.rows().filter((w) => w.problemCount > 0).slice(0, 5));
  readonly filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.rows() : this.rows().filter((w) => w.persona === f);
  });
  readonly tableRows = computed(() =>
    this.filtered().map((ws) => ({
      id: ws.id,
      name: ws.name,
      persona: ws.persona,
      status: this.statusOf(ws),
      objects: ws.objectCount,
      branches: ws.branchCount,
      docs: ws.documentCount,
      usage: ws.usageMinor,
      updated: this.activityLabel(ws),
    })),
  );
  readonly totalObjects = computed(() => this.rows().reduce((n, w) => n + w.objectCount, 0));
  readonly openProblems = computed(() => this.rows().reduce((n, w) => n + w.problemCount, 0));
  readonly totalUsage = computed(() => this.rows().reduce((n, w) => n + w.usageMinor, 0));

  constructor() {
    this.shell.showHomeDashboard();
    this.reload();
    this.shell.requestCreateWorkspace.subscribe(() => this.creating.set(true));
    this.shell.workspacesChanged.subscribe(() => this.reload());
  }

  reload(): void {
    this.api.dashboard().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.error.set('');
      },
      error: (err) => this.error.set(err?.error?.error ?? 'Could not load workspace dashboard.'),
    });
  }

  open(ws: WorkspaceSummary): void {
    void this.router.navigate(['/workspaces', ws.id]);
  }

  openById(id: unknown): void {
    const ws = this.rows().find((w) => w.id === id);
    if (ws) this.open(ws);
  }

  create(): void {
    if (!this.name.trim() || !this.persona) return;
    this.busy.set(true);
    this.api.createWorkspace(this.name.trim(), this.persona).subscribe({
      next: (ws) => {
        this.busy.set(false);
        this.name = '';
        this.creating.set(false);
        this.shell.workspacesChanged.next();
        void this.router.navigate(['/workspaces', ws.id]);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.error ?? 'Could not create workspace');
      },
    });
  }

  removeById(id: unknown): void {
    const ws = this.rows().find((w) => w.id === id);
    if (!ws) return;
    if (!window.confirm(`Delete workspace “${ws.name}”? This cannot be undone.`)) return;
    this.api.deleteWorkspace(ws.id).subscribe({
      next: () => {
        this.shell.workspacesChanged.next();
        this.reload();
      },
      error: (err) => this.error.set(err?.error?.error ?? 'Could not delete workspace'),
    });
  }

  statusOf(ws: WorkspaceSummary): string {
    if (ws.problemCount > 0) return 'Needs review';
    if (ws.objectCount === 0) return 'Empty';
    if (ws.lastActivity) return 'Active';
    return 'Ready';
  }

  activityLabel(ws: WorkspaceSummary): string {
    const raw = ws.lastActivity || ws.createdAt;
    if (!raw) return '—';
    return new Date(raw).toLocaleString();
  }
}
