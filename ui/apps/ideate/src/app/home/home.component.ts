import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MtButtonComponent, MtConfirm, MtIconComponent, MtTableComponent } from '@ideate/ui';
import { IdeateApi, PERSONAS, Persona, WorkspaceSummary, lookupLabel, personaIcon } from '@ideate/api-client';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { ShellContextService } from '../core/shell/shell-context.service';

@Component({
  selector: 'ideate-home',
  imports: [FormsModule, MtButtonComponent, MtIconComponent, MtTableComponent],
  template: `
    <div class="page">
      <div class="scroll">
        <div class="inner">
          <header class="hero">
            <div>
              <p class="kicker">Home</p>
              <h1>Workspace dashboard</h1>
              <p class="lead">Open an existing workspace, or ask a question below to start a new one.</p>
            </div>
            <div class="hero-actions">
              <mt-button size="sm" variant="text" icon="refresh" [label]="'Refresh'" (clicked)="reload()" />
              <mt-button size="sm" icon="add" [label]="'New workspace'" (clicked)="focusComposer()" />
            </div>
          </header>

          @if (error()) {
            <p class="err">{{ error() }}</p>
          }

          <section class="metrics" aria-label="Usage metrics">
            <article class="metric">
              <div class="metric-head">
                <span class="l">Credits</span>
                <mt-icon name="wallet" [size]="13" />
              </div>
              <span class="n">{{ credits() ?? '—' }}</span>
            </article>
            <article class="metric">
              <div class="metric-head">
                <span class="l">Est. INR</span>
                <mt-icon name="percent" [size]="13" />
              </div>
              <span class="n">{{ rupees(totalUsage()) }}</span>
            </article>
            <article class="metric clickable" [class.active]="filter() === 'all'" (click)="filter.set('all')">
              <div class="metric-head">
                <span class="l">Workspaces</span>
                <mt-icon name="briefcase" [size]="13" />
              </div>
              <span class="n">{{ rows().length }}</span>
            </article>
            <article class="metric">
              <div class="metric-head">
                <span class="l">Objects</span>
                <mt-icon name="sitemap" [size]="13" />
              </div>
              <span class="n">{{ totalObjects() }}</span>
            </article>
            <article class="metric" [class.warn]="openProblems() > 0">
              <div class="metric-head">
                <span class="l">Open problems</span>
                <mt-icon name="flag" [size]="13" />
              </div>
              <span class="n">{{ openProblems() }}</span>
            </article>
            <article class="metric">
              <div class="metric-head">
                <span class="l">Usage (minor)</span>
                <mt-icon name="chart" [size]="13" />
              </div>
              <span class="n">{{ totalUsage() }}</span>
            </article>
          </section>

          <div class="lists">
            <section class="panel">
              <h2>Recent</h2>
              @if (recent().length === 0) {
                <p class="muted">Nothing recent yet.</p>
              } @else {
                <ul class="list">
                  @for (ws of recent(); track ws.id) {
                    <li>
                      <button type="button" class="link" (click)="open(ws)">{{ ws.name }}</button>
                      <span class="meta">{{ lookupLabel(ws.persona) }} · {{ statusOf(ws) }}</span>
                    </li>
                  }
                </ul>
              }
            </section>
            <section class="panel">
              <h2>Needs attention</h2>
              @if (attention().length === 0) {
                <p class="muted">No open problems.</p>
              } @else {
                <ul class="list">
                  @for (ws of attention(); track ws.id) {
                    <li>
                      <button type="button" class="link" (click)="open(ws)">{{ ws.name }}</button>
                      <span class="meta">{{ ws.problemCount }} problems</span>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>

          <section class="panel table-panel">
            <div class="section-head">
              <h2>{{ filter() === 'all' ? 'All workspaces' : lookupLabel(filter()) + ' workspaces' }}</h2>
              <div class="persona-filters">
                <button type="button" class="chip" [class.on]="filter() === 'all'" (click)="filter.set('all')">All</button>
                @for (p of personas; track p) {
                  <button type="button" class="chip" [class.on]="filter() === p" (click)="filter.set(p)">
                    <mt-icon [name]="personaIcon(p)" [size]="12" [style.color]="'var(--ideate-persona-' + p + ')'" />
                    {{ lookupLabel(p) }}
                    <span class="count">{{ countByPersona()[p] }}</span>
                  </button>
                }
              </div>
            </div>
            <mt-table
              [columns]="columns"
              [value]="tableRows()"
              [actions]="true"
              dataKey="id"
              emptyMessage="No workspaces yet. Ask a question below to create one."
            >
              <ng-template #actions let-row>
                <div class="row-actions">
                  <mt-button size="sm" [label]="'Open'" (clicked)="openById(row['id'])" />
                  <mt-button size="sm" variant="text" icon="recycle_bin" [label]="'Delete'" (clicked)="removeById(row['id'])" />
                </div>
              </ng-template>
            </mt-table>
          </section>
        </div>
      </div>

      <div class="dock">
        <div class="composer">
          <div class="composer-meta">
            <div class="persona-pick" role="radiogroup" aria-label="Persona">
              @for (p of personas; track p) {
                <button
                  type="button"
                  class="chip"
                  role="radio"
                  [attr.aria-checked]="persona === p"
                  [class.on]="persona === p"
                  (click)="persona = p"
                >
                  <mt-icon [name]="personaIcon(p)" [size]="12" [style.color]="'var(--ideate-persona-' + p + ')'" />
                  {{ lookupLabel(p) }}
                </button>
              }
            </div>
            @if (busy()) {
              <span class="status">Creating workspace…</span>
            }
          </div>
          @if (rows().length === 0) {
            <div class="sparks">
              @for (s of sparks; track s) {
                <button type="button" class="spark" [disabled]="busy()" (click)="useSpark(s)">{{ s }}</button>
              }
            </div>
          }
          <div class="box" [class.busy]="busy()">
            <textarea
              #prompt
              rows="1"
              [(ngModel)]="draft"
              [disabled]="busy()"
              placeholder="Ask a question to start a workspace…"
              (keydown)="onPromptKey($event)"
              (input)="growPrompt()"
            ></textarea>
            <mt-button
              size="sm"
              icon="send"
              [label]="'Send'"
              [disabled]="busy() || !draft.trim()"
              (clicked)="startFromPrompt()"
            />
          </div>
          <p class="composer-hint">Enter to create · Shift+Enter for a new line. A new {{ lookupLabel(persona) }} workspace is named from your question.</p>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%; overflow: hidden;
    }
    .page { display: flex; flex-direction: column; flex: 1; min-height: 0; height: 100%; }
    .scroll { flex: 1; min-height: 0; overflow: auto; }
    .inner { max-width: 76rem; margin: 0 auto; padding: 0.75rem 1rem 1rem; }
    .hero { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; margin-bottom: 0.7rem; }
    .hero-actions { display: flex; gap: 0.3rem; align-items: center; }
    .kicker {
      margin: 0 0 0.15rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--mt-primary, #10b981);
    }
    h1, h2 { margin: 0; }
    h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; }
    h2 {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
      color: var(--mt-text-muted);
    }
    .lead { margin: 0.2rem 0 0; color: var(--mt-text-muted); font-size: var(--mt-fs-sm); max-width: 36rem; }
    .err { color: var(--mt-severity-danger); margin: 0 0 0.5rem; font-size: var(--mt-fs-sm); }
    .muted { margin: 0.25rem 0 0; font-size: var(--mt-fs-sm); color: var(--mt-text-muted); }

    .metrics {
      display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.4rem; margin-bottom: 0.7rem;
    }
    @media (max-width: 60rem) { .metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 32rem) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .metric {
      border: 1px solid var(--surface-border);
      background: var(--mt-surface-card);
      border-radius: var(--mt-panel-border-radius, 2px);
      padding: 0.5rem 0.6rem 0.45rem;
      min-width: 0;
    }
    .metric.clickable { cursor: pointer; }
    .metric.clickable:hover, .metric.active {
      border-color: color-mix(in srgb, var(--mt-primary, #10b981) 45%, var(--surface-border));
    }
    .metric-head {
      display: flex; justify-content: space-between; align-items: center; gap: 0.35rem;
      color: var(--mt-text-muted);
    }
    .metric .l { font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 650; }
    .metric .n {
      display: block; margin-top: 0.2rem; font-size: 1.2rem; font-weight: 700;
      font-variant-numeric: tabular-nums; letter-spacing: -0.03em; line-height: 1.15;
    }
    .metric.warn .n { color: var(--mt-severity-danger, #b91c1c); }

    .lists { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; margin-bottom: 0.55rem; }
    @media (max-width: 40rem) { .lists { grid-template-columns: 1fr; } }
    .panel {
      border: 1px solid var(--surface-border);
      background: var(--mt-surface-card);
      border-radius: var(--mt-panel-border-radius, 2px);
      padding: 0.5rem 0.55rem 0.55rem;
      min-width: 0;
    }
    .table-panel { padding-bottom: 0.35rem; }
    .section-head { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.45rem; }
    .persona-filters, .persona-pick, .sparks { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .chip, .spark {
      display: inline-flex; align-items: center; gap: 0.28rem;
      border: 1px solid var(--surface-border); background: transparent; color: inherit;
      font: inherit; font-size: var(--mt-fs-sm); cursor: pointer;
      padding: 0.12rem 0.45rem; border-radius: 999px;
    }
    .chip:hover, .spark:hover { border-color: var(--mt-primary, #10b981); color: var(--mt-primary, #10b981); }
    .chip.on {
      border-color: color-mix(in srgb, var(--mt-primary, #10b981) 50%, var(--surface-border));
      background: color-mix(in srgb, var(--mt-primary, #10b981) 12%, transparent);
      font-weight: 650;
    }
    .chip .count { color: var(--mt-text-muted); font-variant-numeric: tabular-nums; }
    .list { list-style: none; margin: 0.25rem 0 0; padding: 0; }
    .list li { display: flex; flex-direction: column; padding: 0.28rem 0; border-bottom: 1px solid var(--surface-border); }
    .list li:last-child { border-bottom: 0; }
    .link {
      width: 100%; text-align: left; background: none; border: 0; color: inherit; cursor: pointer;
      padding: 0; font: inherit; font-weight: 650;
    }
    .link:hover { color: var(--mt-primary); }
    .meta { font-size: var(--mt-fs-sm); color: var(--mt-text-muted); text-transform: capitalize; }
    .row-actions { display: flex; gap: 0.3rem; }

    .dock {
      flex-shrink: 0;
      border-top: 1px solid var(--surface-border);
      background: color-mix(in srgb, var(--mt-surface-card, #fff) 92%, var(--surface-ground, #f4f4f5));
      padding: 0.55rem 1rem 0.65rem;
    }
    .composer { max-width: 46rem; margin: 0 auto; }
    .composer-meta { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
    .status { font-size: var(--mt-fs-sm); color: var(--mt-primary, #10b981); font-weight: 650; }
    .sparks { margin-bottom: 0.35rem; }
    .spark { max-width: 100%; }
    .box {
      display: flex; align-items: flex-end; gap: 0.4rem;
      border: 1px solid var(--surface-border);
      border-radius: 1.15rem;
      padding: 0.4rem 0.45rem 0.4rem 0.8rem;
      background: var(--mt-surface-card, #fff);
      box-shadow: 0 10px 28px color-mix(in srgb, var(--mt-text, #111) 8%, transparent);
    }
    .box.busy { opacity: 0.72; }
    textarea {
      flex: 1; min-width: 0; border: 0; resize: none; outline: none;
      background: transparent; color: inherit; font: inherit;
      min-height: 1.6rem; max-height: 8rem; line-height: 1.4; padding: 0.2rem 0;
    }
    .composer-hint { margin: 0.35rem 0 0; text-align: center; font-size: 0.68rem; color: var(--mt-text-muted); }
  `,
})
export class HomeComponent {
  private readonly api = inject(IdeateApi);
  private readonly router = inject(Router);
  private readonly shell = inject(ShellContextService);
  private readonly confirm = inject(MtConfirm);
  private readonly promptEl = viewChild<ElementRef<HTMLTextAreaElement>>('prompt');
  readonly personas = PERSONAS;
  readonly lookupLabel = lookupLabel;
  readonly personaIcon = personaIcon;
  readonly sparks = [
    'Why does ice float on water?',
    'How can a steel ship float?',
    'What is pgvector useful for in search?',
  ];
  readonly rows = signal<WorkspaceSummary[]>([]);
  readonly credits = signal<number | null>(null);
  readonly error = signal('');
  readonly filter = signal<'all' | Persona>('all');
  readonly busy = signal(false);
  draft = '';
  persona: Persona = 'student';
  readonly columns = [
    { field: 'name', header: 'Name' },
    { field: 'persona', header: 'Persona', width: '6.5rem' },
    { field: 'status', header: 'Status', width: '6.5rem' },
    { field: 'objects', header: 'Objects', width: '4.8rem' },
    { field: 'branches', header: 'Branches', width: '5rem' },
    { field: 'docs', header: 'Docs', width: '3.8rem' },
    { field: 'usage', header: 'Usage', width: '4.5rem' },
    { field: 'updated', header: 'Updated', width: '9.5rem' },
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
      persona: lookupLabel(ws.persona),
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
    this.shell.requestCreateWorkspace.subscribe(() => this.focusComposer());
    this.shell.workspacesChanged.subscribe(() => this.reload());
  }

  rupees(minor: number): string {
    return (minor / 100).toFixed(2);
  }

  reload(): void {
    forkJoin({
      rows: this.api.dashboard(),
      credits: this.api.credits().pipe(
        catchError(() => of({ accountId: '', plan: '', balance: 0 })),
      ),
    }).subscribe({
      next: ({ rows, credits }) => {
        this.rows.set(rows);
        this.credits.set(credits.balance);
        this.shell.credits.set(credits.balance);
        this.shell.usageMinor.set(rows.reduce((n, w) => n + w.usageMinor, 0));
        this.error.set('');
      },
      error: (err) => this.error.set(err?.error?.error ?? 'Could not load workspace dashboard.'),
    });
  }

  focusComposer(): void {
    queueMicrotask(() => this.promptEl()?.nativeElement.focus());
  }

  useSpark(text: string): void {
    this.draft = text;
    this.growPrompt();
    this.focusComposer();
  }

  onPromptKey(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.startFromPrompt();
    }
  }

  growPrompt(): void {
    const el = this.promptEl()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  startFromPrompt(): void {
    const question = this.draft.trim();
    if (!question || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const name = nameFromQuestion(question);
    this.api
      .createWorkspace(name, this.persona)
      .pipe(
        switchMap((ws) =>
          this.api.turn(ws.id, { content: question, mode: 'explore' }).pipe(
            catchError(() => of(null)),
            switchMap(() => of(ws)),
          ),
        ),
      )
      .subscribe({
        next: (ws) => {
          this.busy.set(false);
          this.draft = '';
          this.shell.workspacesChanged.next();
          void this.router.navigate(['/workspaces', ws.id]);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.error ?? 'Could not create workspace');
        },
      });
  }

  open(ws: WorkspaceSummary): void {
    void this.router.navigate(['/workspaces', ws.id]);
  }

  openById(id: unknown): void {
    const ws = this.rows().find((w) => w.id === id);
    if (ws) this.open(ws);
  }

  removeById(id: unknown): void {
    const ws = this.rows().find((w) => w.id === id);
    if (!ws) return;
    this.confirm.confirm({
      header: 'Delete workspace?',
      message: `Delete “${ws.name}”? Cards, documents, and history in this workspace will be removed. This cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      danger: true,
      accept: () => {
        this.api.deleteWorkspace(ws.id).subscribe({
          next: () => {
            this.shell.workspacesChanged.next();
            this.reload();
          },
          error: (err) => this.error.set(err?.error?.error ?? 'Could not delete workspace'),
        });
      },
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

function nameFromQuestion(question: string): string {
  const trimmed = question.replace(/\s+/g, ' ').trim().replace(/[?!.]+$/, '');
  if (!trimmed) return 'New workspace';
  if (trimmed.length <= 48) return trimmed;
  return `${trimmed.slice(0, 47).trim()}…`;
}
