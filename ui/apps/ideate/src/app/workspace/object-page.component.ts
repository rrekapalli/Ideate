import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Attachment,
  GraphSnapshot,
  IdeaObject,
  JobRecord,
  lookupLabel,
  SimilarObject,
  TimelineEvent,
  TranscriptMessage,
  UsageEvent,
  UsageRollup,
} from '@ideate/api-client';
import { MtButtonComponent, MtMenuComponent, MtTabComponent, MtTabsComponent, type MtMenuItem } from '@ideate/ui';
import { MdViewComponent } from '../shared/md-view.component';
import { hasMermaidFence } from '../shared/render-markdown';
import { TypeGlyphComponent } from '../shared/type-glyph.component';
import { AttachmentListComponent } from '../shared/attachment-list.component';
import { AttachmentStore } from './attachment.store';
import { ShellContextService } from '../core/shell/shell-context.service';
import { DiagramCanvasBridge } from '../cards/diagram-canvas-bridge';
import {
  ExplorerCardAction,
  InventorCardAction,
  ProductCardAction,
  epistemicChips,
  hasTag,
  isExplorerPersona,
  isInventorPersona,
  isProductResearchPersona,
  isStudentPersona,
  orderedObjectTypes,
  typeDisplayLabel,
} from '../persona/persona-lens';
import { InventorObjectPanelComponent } from './inventor-object-panel.component';
import { cardUserNote, includeCardNoteInAi } from '../cards/card-note';

@Component({
  selector: 'ideate-object-page',
  imports: [FormsModule, MtButtonComponent, MtMenuComponent, MtTabsComponent, MtTabComponent, MdViewComponent, TypeGlyphComponent, AttachmentListComponent, InventorObjectPanelComponent],
  template: `
    <div class="page">
      <nav class="crumb" aria-label="Path from parent">
        @for (node of crumbs(); track node.id; let last = $last) {
          @if (!last) {
            <button type="button" class="crumb-node" (click)="open.emit(node)">
              <span class="crumb-id">{{ node.displayId }}</span>
              <span class="crumb-title">{{ shortTitle(node) }}</span>
            </button>
            <span class="sep" aria-hidden="true">›</span>
          } @else {
            <span class="crumb-node here">
              <span class="crumb-id">{{ node.displayId }}</span>
              <span class="crumb-title">{{ shortTitle(node) }}</span>
            </span>
          }
        }
      </nav>

      <header class="hero">
        <div class="kicker">
          <ideate-type-glyph [type]="object().type" [size]="16" />
          <span class="id">{{ object().displayId }}</span>
          <select [ngModel]="object().type" (ngModelChange)="typeChange.emit($event)">
            @for (t of types(); track t) {
              <option [value]="t">{{ typeLabel(t) }}</option>
            }
          </select>
          <span class="pill">v{{ object().version }}</span>
          <span class="pill">{{ lookupLabel(object().objectCategory) }}</span>
          @for (chip of epistemic(); track chip.kind + (chip.why || '')) {
            <span class="pill">{{ chip.label }}{{ chip.why ? ' · ' + chip.why : '' }}</span>
          }
        </div>
        <div class="hero-row">
          <h1>{{ object().title }}</h1>
          <div class="actions">
            @for (act of studentActions(); track act.action) {
              <mt-button size="sm" variant="outlined" [label]="act.label" (clicked)="emitStudent(act.action)" />
            }
            @for (act of inventorActions(); track act.action) {
              <mt-button size="sm" variant="outlined" [label]="act.label" (clicked)="emitInventor(act.action)" />
            }
            @for (act of explorerActions(); track act.action) {
              <mt-button size="sm" variant="outlined" [label]="act.label" (clicked)="emitExplorer(act.action)" />
            }
            @for (act of productActions(); track act.action) {
              <mt-button size="sm" variant="outlined" [label]="act.label" (clicked)="emitProduct(act.action)" />
            }
            <mt-menu #plusMenu [model]="plusItems()">
              <mt-button size="sm" variant="icon" icon="add" ariaLabel="Card actions" (clicked)="plusMenu.toggle($event)" />
            </mt-menu>
            <mt-button size="sm" variant="outlined" label="Open in Chat" (clicked)="openChat.emit(object())" />
            <mt-button size="sm" variant="icon" icon="recycle_bin" ariaLabel="Delete" (clicked)="menu.emit(object())" />
          </div>
        </div>
      </header>

      <mt-tabs [value]="pane()" (valueChange)="pane.set($event + '')">
        <mt-tab value="page" [label]="object().displayId">
          <div class="pane prose">
            @if (distinctPageCopy(); as copy) {
              <section class="essay">
                <ideate-md [source]="copy" [diagrams]="true" />
              </section>
            }
            @if (userMessage() || assistantMessage()) {
              <section class="source" [class.source--solo]="!distinctPageCopy()">
                <h2>Conversation</h2>
                @if (userMessage(); as u) {
                  <article class="quote">
                    <p class="who">You · {{ when(u.createdAt) }}</p>
                    <ideate-md [source]="u.content" [diagrams]="true" />
                  </article>
                }
                @if (assistantMessage(); as a) {
                  <article class="quote ai">
                    <p class="who">Ideate · {{ when(a.createdAt) }}</p>
                    <ideate-md [source]="a.content" [diagrams]="true" />
                  </article>
                }
              </section>
            }
            @if (noteText()) {
              <section class="source card-note">
                <h2>Note{{ noteInAi() ? ' · included in AI' : '' }}</h2>
                <ideate-md [source]="noteText()" />
              </section>
            }
            @if (showDesign()) {
              <ideate-inventor-object-panel
                [workspaceId]="workspaceId()"
                [object]="object()"
                [snapshot]="snapshot()"
                (changed)="changed.emit()"
                (focus)="open.emit($event)"
                (recompute)="emitInventor('recompute')"
                (reuse)="reuse.emit($event)"
              />
            }
            <section class="source files">
              <h2>Attachments</h2>
              <ideate-attachment-list
                [items]="attachments()"
                [canAdd]="true"
                (addFiles)="addFiles($event)"
                (remove)="removeFile($event)"
              />
            </section>
          </div>
        </mt-tab>
        <mt-tab value="stats" label="Stats">
          <div class="pane stats">
            <section>
              <h2>This card</h2>
              <dl>
                <div><dt>Created</dt><dd>{{ when(object().createdAt) }}</dd></div>
                <div><dt>Updated</dt><dd>{{ when(object().updatedAt) }}</dd></div>
                <div><dt>Origin</dt><dd>{{ object().origin }}</dd></div>
                <div><dt>Generated by</dt><dd>{{ object().generatedBy || 'user' }}</dd></div>
                @if (object().sourceUserMessageId) {
                  <div><dt>User message</dt><dd class="mono">{{ object().sourceUserMessageId }}</dd></div>
                }
                @if (object().sourceAssistantMessageId) {
                  <div><dt>Assistant message</dt><dd class="mono">{{ object().sourceAssistantMessageId }}</dd></div>
                }
              </dl>
            </section>
            <section>
              <h2>AI tokens</h2>
              @if (tokenTotals(); as tot) {
                <div class="metrics">
                  <div class="metric">
                    <span class="n">{{ tot.input }}</span>
                    <span class="l">input</span>
                  </div>
                  <div class="metric">
                    <span class="n">{{ tot.output }}</span>
                    <span class="l">output</span>
                  </div>
                  <div class="metric">
                    <span class="n">{{ tot.calls }}</span>
                    <span class="l">calls</span>
                  </div>
                  <div class="metric">
                    <span class="n">{{ rupees(tot.costMinor) }}</span>
                    <span class="l">est. INR</span>
                  </div>
                </div>
                @if (relatedUsage().length) {
                  <table>
                    <thead>
                      <tr><th>When</th><th>Model</th><th>In</th><th>Out</th><th>Job</th></tr>
                    </thead>
                    <tbody>
                      @for (row of relatedUsage(); track row.id) {
                        <tr>
                          <td>{{ when(row.createdAt) }}</td>
                          <td>{{ row.model || row.provider }}</td>
                          <td>{{ row.inputTokens }}</td>
                          <td>{{ row.outputTokens }}</td>
                          <td class="mono">{{ row.jobClass }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              } @else {
                <p class="muted">No token events tied to this card yet. Workspace estimate: {{ rupees(usage()?.estimatedCostMinorInr ?? 0) }}.</p>
              }
            </section>
            <section>
              <h2>Jobs</h2>
              @if (relatedJobs().length === 0) {
                <p class="muted">No jobs mention this card.</p>
              }
              @for (job of relatedJobs(); track job.id) {
                <article class="log">
                  <p><strong>{{ job.jobClass }}</strong> · {{ job.status }} · {{ when(job.createdAt) }}</p>
                  @if (job.error) {
                    <p class="err">{{ job.error }}</p>
                  }
                  <p class="mono muted">{{ job.id }}</p>
                </article>
              }
            </section>
            <section>
              <h2>Log</h2>
              @if (relatedEvents().length === 0) {
                <p class="muted">No timeline events for this card.</p>
              }
              @for (ev of relatedEvents(); track ev.id) {
                <article class="log">
                  <p><strong>{{ ev.eventType }}</strong> · {{ when(ev.createdAt) }}</p>
                  @if (ev.payload) {
                    <pre>{{ ev.payload }}</pre>
                  }
                </article>
              }
            </section>
          </div>
        </mt-tab>
      </mt-tabs>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .page {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      background: var(--mt-surface-card, #fff);
    }
    .crumb {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.35rem;
      padding: 0.7rem 1.25rem 0.35rem;
      border-bottom: 1px solid color-mix(in srgb, var(--mt-surface-border, #e5e7eb) 70%, transparent);
    }
    .crumb-node {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.05rem;
      max-width: 14rem;
      padding: 0.2rem 0.4rem;
      border: 0;
      border-radius: var(--mt-panel-border-radius, 2px);
      background: color-mix(in srgb, var(--mt-text) 5%, transparent);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .crumb-node.here {
      background: color-mix(in srgb, var(--mt-primary, #10b981) 12%, transparent);
      cursor: default;
    }
    button.crumb-node:hover { background: color-mix(in srgb, var(--mt-primary, #10b981) 16%, transparent); }
    .crumb-id {
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--mt-primary, #10b981);
    }
    .crumb-title {
      font-size: 0.75rem;
      line-height: 1.25;
      color: var(--mt-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 13rem;
    }
    .sep { color: var(--mt-text-muted); padding: 0 0.1rem; }
    .hero { padding: 0.85rem 1.25rem 0.55rem; }
    .kicker { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.35rem; }
    .id { font-family: var(--font-family-mono, ui-monospace, monospace); font-weight: 700; }
    select { background: transparent; color: inherit; border: 0; font: inherit; }
    .pill {
      font-size: 0.72rem;
      color: var(--mt-text-muted);
      padding: 0.08rem 0.35rem;
      border: 1px solid var(--mt-surface-border, #e5e7eb);
      border-radius: 99px;
    }
    .hero-row { display: flex; gap: 1rem; align-items: flex-start; justify-content: space-between; }
    h1 { margin: 0; font-size: 1.45rem; line-height: 1.25; font-weight: 650; }
    .actions { display: flex; gap: 0.25rem; flex-shrink: 0; }
    .pane { padding: 0.75rem 1.35rem 1.6rem; max-width: 46rem; }
    .prose { font-size: 1rem; line-height: 1.65; color: var(--mt-text); }
    .essay ::ng-deep .md h1 { font-size: 1.25rem; margin: 1.1rem 0 0.4rem; }
    .essay ::ng-deep .md h2 { font-size: 1.1rem; margin: 1rem 0 0.35rem; }
    .essay ::ng-deep .md h3 { font-size: 1rem; margin: 0.85rem 0 0.3rem; }
    .essay ::ng-deep .md p { margin: 0 0 0.85em; }
    .essay ::ng-deep .mermaid-slot { margin: 1rem 0; }
    .source { margin-top: 1.75rem; padding-top: 1rem; border-top: 1px solid var(--mt-surface-border, #e5e7eb); }
    .source--solo { margin-top: 0; padding-top: 0; border-top: 0; }
    .files { margin-top: 1.75rem; padding-top: 1rem; border-top: 1px solid var(--mt-surface-border, #e5e7eb); }
    .source h2, .stats h2, .files h2 {
      margin: 0 0 0.65rem;
      font-size: 0.78rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--mt-text-muted);
    }
    .quote {
      margin: 0 0 0.85rem;
      padding: 0.65rem 0.8rem;
      border-left: 3px solid var(--mt-primary, #10b981);
      background: color-mix(in srgb, var(--mt-text) 4%, transparent);
    }
    .quote.ai { border-left-color: color-mix(in srgb, var(--mt-text) 28%, transparent); }
    .who { margin: 0 0 0.35rem; font-size: 0.75rem; color: var(--mt-text-muted); font-weight: 650; }
    .stats { display: flex; flex-direction: column; gap: 1.4rem; max-width: 52rem; }
    dl { display: grid; gap: 0.45rem; margin: 0; }
    dl > div { display: grid; grid-template-columns: 9.5rem 1fr; gap: 0.6rem; font-size: 0.88rem; }
    dt { color: var(--mt-text-muted); }
    dd { margin: 0; }
    .metrics { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-bottom: 0.8rem; }
    .metric {
      min-width: 5.5rem;
      padding: 0.55rem 0.7rem;
      background: color-mix(in srgb, var(--mt-text) 5%, transparent);
      border-radius: var(--mt-panel-border-radius, 2px);
    }
    .metric .n { display: block; font-size: 1.15rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .metric .l { font-size: 0.7rem; color: var(--mt-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { text-align: left; padding: 0.35rem 0.4rem; border-bottom: 1px solid var(--mt-surface-border, #e5e7eb); }
    th { color: var(--mt-text-muted); font-weight: 600; }
    .log { margin: 0 0 0.65rem; }
    .log p { margin: 0 0 0.2rem; }
    .log pre {
      margin: 0.25rem 0 0;
      padding: 0.4rem 0.5rem;
      overflow: auto;
      font-size: 0.75rem;
      background: color-mix(in srgb, var(--mt-text) 5%, transparent);
    }
    .mono { font-family: var(--font-family-mono, ui-monospace, monospace); font-size: 0.78rem; word-break: break-all; }
    .muted { color: var(--mt-text-muted); font-size: 0.85rem; }
    .err { color: #b45309; }
    .card-note { margin-top: 0.4rem; }
  `,
})
export class ObjectPageComponent {
  private readonly attachmentsStore = inject(AttachmentStore);
  private readonly shell = inject(ShellContextService);
  private readonly bridge = inject(DiagramCanvasBridge, { optional: true });
  readonly object = input.required<IdeaObject>();
  readonly trail = input<IdeaObject[]>([]);
  readonly userMessage = input<TranscriptMessage | null>(null);
  readonly assistantMessage = input<TranscriptMessage | null>(null);
  readonly jobs = input<JobRecord[]>([]);
  readonly timeline = input<TimelineEvent[]>([]);
  readonly usage = input<UsageRollup | null>(null);
  readonly workspaceId = input('');
  readonly snapshot = input<GraphSnapshot>({ nodes: [], edges: [] });
  readonly typeChange = output<string>();
  readonly menu = output<IdeaObject>();
  readonly newNode = output<IdeaObject>();
  readonly note = output<IdeaObject>();
  readonly openChat = output<IdeaObject>();
  readonly open = output<IdeaObject>();
  readonly changed = output<void>();
  readonly reuse = output<SimilarObject>();
  readonly types = computed(() => orderedObjectTypes(this.shell.workspacePersona()));
  readonly lookupLabel = lookupLabel;
  readonly pane = signal<string>('page');
  readonly crumbs = computed(() => {
    const trail = this.trail();
    return trail.length ? trail : [this.object()];
  });
  readonly attachments = computed(() => this.attachmentsStore.forObject(this.object().id));
  readonly studentActions = computed(() => {
    if (!isStudentPersona(this.shell.workspacePersona())) {
      return [] as { action: 'promote-question' | 'attach-example' | 'accept-example' | 'explain-shorter' | 'explain-fuller'; label: string }[];
    }
    const obj = this.object();
    const acts: { action: 'promote-question' | 'attach-example' | 'accept-example' | 'explain-shorter' | 'explain-fuller'; label: string }[] = [];
    if (obj.type === 'unknown') {
      acts.push({ action: 'promote-question', label: 'Promote to question' });
      acts.push({ action: 'attach-example', label: 'Attach example' });
    }
    if (obj.type === 'evidence' && hasTag(obj.tags, 'example') && obj.objectCategory !== 'supported') {
      acts.push({ action: 'accept-example', label: 'Accept example' });
    }
    if (obj.type === 'concept') {
      acts.push({ action: 'explain-shorter', label: 'Shorter' });
      acts.push({ action: 'explain-fuller', label: 'Fuller' });
    }
    return acts;
  });
  readonly inventorActions = computed(() => {
    if (!isInventorPersona(this.shell.workspacePersona())) {
      return [] as { action: InventorCardAction; label: string }[];
    }
    const obj = this.object();
    const acts: { action: InventorCardAction; label: string }[] = [];
    if (obj.type === 'constraint') {
      acts.push({ action: 'relax', label: 'Relax' }, { action: 'tighten', label: 'Tighten' }, { action: 'show-binds', label: 'What it binds' });
    }
    if (obj.type === 'target') {
      acts.push({ action: 'convert-observation', label: 'Convert to observation' });
    }
    if (obj.type === 'calculation') {
      acts.push({ action: 'recompute', label: 'Recompute' }, { action: 'show-chain', label: 'Show chain' }, { action: 'mark-estimate', label: 'Mark estimate' });
    }
    if (obj.type === 'architecture') {
      acts.push({ action: 'diff-bom', label: 'Diff BOM' }, { action: 'add-component', label: 'Add component' });
    }
    if (obj.type === 'hypothesis') {
      acts.push({ action: 'start-evaluation', label: 'Start evaluation' });
    }
    if (obj.type === 'evaluation') {
      acts.push({ action: 'accept-evaluation', label: 'Accept' }, { action: 'reject-evaluation', label: 'Reject' });
    }
    if (obj.type === 'decision') {
      acts.push({ action: 'why-choice', label: 'Why this choice' });
    }
    if (obj.type === 'observation') {
      acts.push({ action: 'record-bench', label: 'Record bench note' });
    }
    if (obj.type === 'design_artifact') {
      acts.push({ action: 'extract-claims', label: 'Extract claims' });
    }
    acts.push({ action: 'reuse', label: 'Reuse from another project' });
    if (obj.objectCategory === 'abandoned') {
      acts.push({ action: 'resurrect', label: 'Resurrect' });
    } else {
      acts.push({ action: 'abandon', label: 'Abandon' });
    }
    return acts;
  });
  readonly explorerActions = computed(() => {
    if (!isExplorerPersona(this.shell.workspacePersona())) {
      return [] as { action: ExplorerCardAction; label: string }[];
    }
    const obj = this.object();
    const acts: { action: ExplorerCardAction; label: string }[] = [];
    if (obj.type === 'thought' && obj.objectCategory !== 'abandoned') {
      acts.push({ action: 'promote-concept', label: 'Promote to concept' });
      acts.push({ action: 'promote-hypothesis', label: 'Promote to hypothesis' });
    }
    if ((obj.type === 'thought' || obj.type === 'concept') && obj.objectCategory !== 'abandoned') {
      acts.push({ action: 'walk-implications', label: 'Walk implications' });
    }
    acts.push({ action: 'link-analogy', label: 'Link analogy' });
    acts.push({ action: 'reuse', label: 'Reuse from another project' });
    if (obj.objectCategory === 'abandoned') {
      acts.push({ action: 'resurrect', label: 'Resurrect' });
    } else if (['thought', 'concept', 'hypothesis', 'assumption', 'unknown'].includes(obj.type)) {
      acts.push({ action: 'abandon', label: 'Abandon' });
    }
    return acts;
  });
  readonly productActions = computed(() => {
    if (!isProductResearchPersona(this.shell.workspacePersona())) {
      return [] as { action: ProductCardAction; label: string }[];
    }
    const obj = this.object();
    const acts: { action: ProductCardAction; label: string }[] = [];
    if (obj.type === 'question') {
      acts.push({ action: 'pin-problem', label: 'Pin problem' });
    }
    if (obj.type === 'assumption' && obj.objectCategory !== 'abandoned') {
      acts.push({ action: 'assumption-break', label: 'What breaks if this is false?' });
    }
    if (obj.type === 'hypothesis' && obj.objectCategory !== 'abandoned') {
      acts.push({ action: 'add-research-note', label: 'Add research note' });
      acts.push({ action: 'critique-bet', label: 'Critique this bet' });
      acts.push({ action: 'record-test', label: 'Record test' });
      acts.push({ action: 'decide', label: 'Decide' });
    }
    if (obj.type === 'experiment') {
      acts.push({ action: 'record-result', label: 'Record result' });
    }
    if (obj.type === 'decision') {
      acts.push({ action: 'write-outcome', label: 'Write outcome' });
      acts.push({ action: 'replay', label: 'Replay' });
    }
    if (obj.objectCategory === 'abandoned') {
      acts.push({ action: 'resurrect', label: 'Resurrect' });
    } else if (['hypothesis', 'assumption', 'decision'].includes(obj.type)) {
      acts.push({ action: 'abandon', label: 'Abandon' });
    }
    acts.push({ action: 'reuse', label: 'Reuse from another project' });
    return acts;
  });
  readonly epistemic = computed(() => epistemicChips(this.object(), this.snapshot().edges ?? []));
  readonly noteText = computed(() => cardUserNote(this.object()));
  readonly noteInAi = computed(() => includeCardNoteInAi(this.object()));
  readonly plusItems = computed((): MtMenuItem[] => [
    { label: 'Add related', icon: 'add', command: () => this.newNode.emit(this.object()) },
    { label: this.noteText() ? 'Edit note' : 'Add note', icon: 'sticky_note', command: () => this.note.emit(this.object()) },
  ]);
  readonly showDesign = computed(() =>
    isInventorPersona(this.shell.workspacePersona()) ||
    isProductResearchPersona(this.shell.workspacePersona()) ||
    ['constraint', 'calculation', 'target', 'architecture', 'component', 'decision', 'observation', 'design_artifact', 'evidence', 'experiment'].includes(this.object().type),
  );

  typeLabel(type: string): string {
    return typeDisplayLabel(this.shell.workspacePersona(), type, type === this.object().type ? this.object().tags : []);
  }

  emitStudent(action: 'promote-question' | 'attach-example' | 'accept-example' | 'explain-shorter' | 'explain-fuller') {
    this.bridge?.studentAction$.next({ object: this.object(), action });
  }

  emitInventor(action: InventorCardAction) {
    this.bridge?.inventorAction$.next({ object: this.object(), action });
  }

  emitExplorer(action: ExplorerCardAction) {
    this.bridge?.explorerAction$.next({ object: this.object(), action });
  }

  emitProduct(action: ProductCardAction) {
    this.bridge?.productAction$.next({ object: this.object(), action });
  }

  addFiles(files: File[]) {
    for (const file of files) {
      this.attachmentsStore.upload(file, this.object().id).subscribe();
    }
  }

  removeFile(item: Attachment) {
    this.attachmentsStore.remove(item.id).subscribe();
  }

  distinctPageCopy(): string | null {
    const raw = ((this.object().body || this.object().summary || '') + '').trim();
    if (!raw || raw === '_No page content yet._') {
      return null;
    }
    const title = (this.object().title || '').trim();
    let text = raw;
    if (title) {
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(`^#{1,6}\\s*${escaped}\\s*`, 'i'), '').trim();
      text = text.replace(new RegExp(`^${escaped}[.!?]?\\s*`, 'i'), '').trim();
    }
    for (const re of ObjectPageComponent.PAGE_FILLER) {
      text = text.replace(re, ' ').trim();
    }
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    const keepDiagram = hasMermaidFence(raw);
    const conversation = [this.userMessage()?.content, this.assistantMessage()?.content]
      .filter(Boolean)
      .join('\n');
    if (!keepDiagram && conversation && this.mostlyCoveredBy(text, `${title}\n${conversation}`)) {
      return null;
    }
    if (!keepDiagram && conversation && this.wordCount(text) < 12) {
      return null;
    }
    return text || null;
  }

  private static readonly PAGE_FILLER: RegExp[] = [
    /this question grows from a card already on the graph\.?/gi,
    /an answer that grows from a card already on the graph\.?/gi,
    /stay with this question\.?/gi,
    /a recap of the graph is not an answer\.?/gi,
    /the unknown this thread is actually asking\.?/gi,
    /the working explanation from this turn\.?/gi,
    /a next question the explanation opened\.?/gi,
    /a follow-up from this turn\.?/gi,
    /a belief that is getting in the way of the answer\.?/gi,
    /let['’]?s stay with your question:?/gi,
    /no summary yet\.?/gi,
  ];

  private mostlyCoveredBy(text: string, shown: string): boolean {
    const leftover = this.normalize(text);
    const hay = this.normalize(shown);
    if (!leftover) {
      return true;
    }
    if (hay.includes(leftover)) {
      return true;
    }
    const sentences = leftover.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 8);
    if (!sentences.length) {
      return true;
    }
    return sentences.every((s) => hay.includes(s));
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#*_`>[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private wordCount(value: string): number {
    return value.split(/\s+/).filter(Boolean).length;
  }

  shortTitle(node: IdeaObject): string {
    const t = (node.title || '').trim();
    return t.length > 42 ? t.slice(0, 41) + '…' : t;
  }

  relatedJobs(): JobRecord[] {
    const id = this.object().id;
    return this.jobs().filter((j) =>
      (j.resultObjectIds ?? []).includes(id) || (j.focusObjectIds ?? []).includes(id),
    );
  }

  relatedEvents(): TimelineEvent[] {
    const id = this.object().id;
    return this.timeline().filter((e) => e.objectId === id);
  }

  relatedUsage(): UsageEvent[] {
    const jobIds = new Set(this.relatedJobs().map((j) => j.id));
    const recent = this.usage()?.recent ?? [];
    const tied = recent.filter((e) => e.jobId && jobIds.has(e.jobId));
    if (tied.length) {
      return tied;
    }
    return jobIds.size ? [] : recent.slice(0, 8);
  }

  tokenTotals() {
    const rows = this.relatedUsage();
    if (!rows.length) {
      return null;
    }
    return {
      input: rows.reduce((s, r) => s + (r.inputTokens || 0), 0),
      output: rows.reduce((s, r) => s + (r.outputTokens || 0), 0),
      calls: rows.length,
      costMinor: rows.reduce((s, r) => s + (r.estimatedCostMinor || 0), 0),
    };
  }

  rupees(minor: number): string {
    return (minor / 100).toFixed(2);
  }

  when(raw?: string): string {
    if (!raw) {
      return '—';
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return raw;
    }
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}
