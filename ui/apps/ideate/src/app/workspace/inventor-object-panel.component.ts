import { Component, OnChanges, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  GraphSnapshot,
  IdeaObject,
  IdeateApi,
  ObjectVersion,
  SimilarObject,
} from '@ideate/api-client';
import { MtButtonComponent } from '@ideate/ui';
import { AttachmentStore } from './attachment.store';
import { TypeGlyphComponent } from '../shared/type-glyph.component';

interface CalcInput {
  name: string;
  value: string;
  unit: string;
  sourceObjectId: string;
}

interface ArtifactRegion {
  id: string;
  label: string;
  claimObjectId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

@Component({
  selector: 'ideate-inventor-object-panel',
  imports: [FormsModule, MtButtonComponent, TypeGlyphComponent],
  template: `
    <section class="panel">
      @if (object().type === 'calculation') {
        <h2>Calculation chain</h2>
        @if (stale()) {
          <p class="warn">Inputs changed. Recompute before treating the output as current.</p>
        }
        @for (row of inputs(); track $index) {
          <div class="row3">
            <input [(ngModel)]="row.name" placeholder="name" />
            <input [(ngModel)]="row.value" placeholder="value" />
            <input [(ngModel)]="row.unit" placeholder="unit" />
          </div>
        }
        <label>Method <input [(ngModel)]="method" placeholder="distance / throwRatio" /></label>
        <label>Output <input [(ngModel)]="outputValue" placeholder="value" /> <input [(ngModel)]="outputUnit" placeholder="unit" /></label>
        <div class="acts">
          <mt-button size="sm" variant="outlined" label="Save inputs" (clicked)="saveCalculation()" />
          <mt-button size="sm" variant="outlined" label="Recompute" (clicked)="recompute.emit()" />
        </div>
        @if (chain().length) {
          <h3>Dependents and sources</h3>
          @for (n of chain(); track n.id) {
            <button type="button" class="link" (click)="focus.emit(n)">
              <ideate-type-glyph [type]="n.type" [size]="12" />
              {{ n.displayId }} {{ n.title }}
            </button>
          }
        }
      }

      @if (object().type === 'constraint') {
        <h2>What this binds</h2>
        @for (n of binds(); track n.id) {
          <button type="button" class="link" (click)="focus.emit(n)">
            <ideate-type-glyph [type]="n.type" [size]="12" />
            {{ n.displayId }} {{ n.title }}
          </button>
        } @empty {
          <p class="muted">No components or calculations on constrains yet.</p>
        }
      }

      @if (object().type === 'observation') {
        <h2>Bench note</h2>
        <label>Date <input type="date" [(ngModel)]="observedAt" /></label>
        <label>Setup <textarea [(ngModel)]="setup" rows="2"></textarea></label>
        <label>Result <textarea [(ngModel)]="result" rows="2"></textarea></label>
        <label>
          Bears on
          <select [(ngModel)]="bearsOnId">
            <option value="">Select hypothesis or target</option>
            @for (n of bearTargets(); track n.id) {
              <option [value]="n.id">{{ n.displayId }} {{ n.title }}</option>
            }
          </select>
        </label>
        <label>
          Relation
          <select [(ngModel)]="bearsOnKind">
            <option value="supports">supports</option>
            <option value="contradicts">weakens</option>
          </select>
        </label>
        <mt-button size="sm" variant="outlined" label="Save bench note" (clicked)="saveBench()" />
      }

      @if (object().type === 'decision') {
        <h2>Why this choice</h2>
        <label>Choice <input [(ngModel)]="choice" /></label>
        <label>Reason <textarea [(ngModel)]="reason" rows="2"></textarea></label>
        <label>Alternatives <input [(ngModel)]="alternatives" placeholder="comma separated" /></label>
        <mt-button size="sm" variant="outlined" label="Save decision" (clicked)="saveDecision()" />
        @if (versions().length) {
          <h3>Versions</h3>
          @for (v of versions(); track v.id) {
            <article class="ver">
              <p><strong>v{{ v.version }}</strong> · {{ v.title }}</p>
              <p class="muted">{{ versionChoice(v) }}</p>
            </article>
          }
        }
      }

      @if (object().type === 'architecture') {
        <h2>BOM</h2>
        @for (part of bom(); track part.id || part.displayId) {
          <p class="row">{{ part.displayId }} {{ part.title }}</p>
        } @empty {
          <p class="muted">No parts on this architecture yet.</p>
        }
        <label>Add part <input [(ngModel)]="newPart" placeholder="Pi Zero 2 W" /></label>
        <div class="acts">
          <mt-button size="sm" variant="outlined" label="Add component" (clicked)="addPart()" />
        </div>
        @if (bomDiff(); as diff) {
          <h3>BOM vs previous version</h3>
          @for (p of diff.added; track p) {
            <p class="ok">Added {{ p }}</p>
          }
          @for (p of diff.dropped; track p) {
            <p class="warn">Dropped {{ p }}</p>
          }
          @if (!diff.added.length && !diff.dropped.length) {
            <p class="muted">No part changes between the last two versions.</p>
          }
        }
      }

      @if (object().type === 'design_artifact') {
        <h2>Concept sheet</h2>
        @if (imageUrl(); as src) {
          <div class="sheet" (pointerdown)="regionStart($event)" (pointerup)="regionEnd($event)">
            <img [src]="src" alt="Design artifact" />
            @for (r of regions(); track r.id) {
              <button
                type="button"
                class="region"
                [style.left.%]="r.x"
                [style.top.%]="r.y"
                [style.width.%]="r.w"
                [style.height.%]="r.h"
                (click)="openRegion(r)"
              >{{ r.label }}</button>
            }
          </div>
        } @else {
          <p class="muted">Attach a sketch or sheet to preview it here.</p>
        }
        <label>Link last region to
          <select [(ngModel)]="regionClaimId">
            <option value="">Select card</option>
            @for (n of snapshot().nodes; track n.id) {
              <option [value]="n.id">{{ n.displayId }} {{ n.title }}</option>
            }
          </select>
        </label>
        <mt-button size="sm" variant="outlined" label="Save region link" (clicked)="saveRegions()" />
      }

      @if (object().type === 'target' || object().type === 'constraint' || object().type === 'architecture') {
        <h2>Reuse from another project</h2>
        <label>Search <input [(ngModel)]="reuseQuery" (keydown.enter)="searchReuse()" /></label>
        <mt-button size="sm" variant="outlined" label="Search account" (clicked)="searchReuse()" />
        @for (hit of reuseHits(); track hit.id) {
          <button type="button" class="link" (click)="reuse.emit(hit)">
            {{ hit.workspaceName }} · {{ hit.displayId }} {{ hit.title }}
          </button>
        }
      }

      @if (versions().length && object().type !== 'decision') {
        <h2>Versions</h2>
        @for (v of versions(); track v.id) {
          <article class="ver">
            <p><strong>v{{ v.version }}</strong> · {{ v.title }}</p>
            <p class="muted">{{ v.summary }}</p>
          </article>
        }
      }
    </section>
  `,
  styles: `
    .panel { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.2rem 0 1rem; }
    h2 { margin: 0.6rem 0 0.2rem; font-size: 0.85rem; }
    h3 { margin: 0.4rem 0 0.15rem; font-size: 0.75rem; color: var(--mt-text-muted); }
    label { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.75rem; }
    input, textarea, select {
      font: inherit; font-size: 0.8rem; padding: 0.25rem 0.35rem;
      border: 1px solid var(--mt-surface-border, var(--surface-border)); background: transparent; color: inherit;
    }
    .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.25rem; }
    .acts { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .link, .row {
      display: flex; align-items: center; gap: 0.25rem; padding: 0.15rem 0; border: 0; background: none;
      color: inherit; font: inherit; font-size: 0.78rem; text-align: left; cursor: pointer;
    }
    .link:hover { color: var(--mt-primary); }
    .muted { margin: 0; font-size: 0.72rem; color: var(--mt-text-muted); }
    .warn { margin: 0; font-size: 0.75rem; color: var(--mt-danger, #b45309); }
    .ok { margin: 0; font-size: 0.75rem; color: var(--mt-primary); }
    .ver { border-top: 1px dotted var(--mt-surface-border, var(--surface-border)); padding-top: 0.25rem; }
    .sheet { position: relative; max-width: 100%; overflow: hidden; }
    .sheet img { display: block; width: 100%; height: auto; }
    .region {
      position: absolute; border: 1px solid var(--mt-primary); background: color-mix(in srgb, var(--mt-primary) 18%, transparent);
      color: inherit; font: inherit; font-size: 0.65rem; cursor: pointer; padding: 0;
    }
  `,
})
export class InventorObjectPanelComponent implements OnChanges, OnInit {
  private readonly api = inject(IdeateApi);
  private readonly attachments = inject(AttachmentStore);
  readonly workspaceId = input.required<string>();
  readonly object = input.required<IdeaObject>();
  readonly snapshot = input.required<GraphSnapshot>();
  readonly changed = output<void>();
  readonly focus = output<IdeaObject>();
  readonly recompute = output<void>();
  readonly reuse = output<SimilarObject>();

  readonly versions = signal<ObjectVersion[]>([]);
  readonly reuseHits = signal<SimilarObject[]>([]);
  method = '';
  outputValue = '';
  outputUnit = '';
  observedAt = '';
  setup = '';
  result = '';
  bearsOnId = '';
  bearsOnKind = 'supports';
  choice = '';
  reason = '';
  alternatives = '';
  newPart = '';
  reuseQuery = '';
  regionClaimId = '';
  private regionDraft: ArtifactRegion | null = null;

  readonly inputs = signal<CalcInput[]>([]);
  readonly regions = signal<ArtifactRegion[]>([]);

  readonly stale = computed(() => this.object().details?.['stale'] === true);
  readonly binds = computed(() => {
    const id = this.object().id;
    const byId = new Map(this.snapshot().nodes.map((n) => [n.id, n]));
    return this.snapshot().edges
      .filter((e) => e.type === 'constrains' && (e.fromObjectId === id || e.toObjectId === id))
      .map((e) => (e.fromObjectId === id ? byId.get(e.toObjectId) : byId.get(e.fromObjectId)))
      .filter((n): n is IdeaObject => !!n && (n.type === 'component' || n.type === 'calculation'));
  });
  readonly chain = computed(() => {
    const id = this.object().id;
    const byId = new Map(this.snapshot().nodes.map((n) => [n.id, n]));
    return this.snapshot().edges
      .filter((e) => e.type === 'calculated-from' && (e.fromObjectId === id || e.toObjectId === id))
      .map((e) => (e.fromObjectId === id ? byId.get(e.toObjectId) : byId.get(e.fromObjectId)))
      .filter((n): n is IdeaObject => !!n);
  });
  readonly bearTargets = computed(() =>
    this.snapshot().nodes.filter((n) => n.type === 'hypothesis' || n.type === 'target'),
  );
  readonly bom = computed(() => {
    const fromDetails = (this.object().details?.['components'] as { id?: string; displayId?: string; title?: string }[]) ?? [];
    if (fromDetails.length) {
      return fromDetails;
    }
    const id = this.object().id;
    const byId = new Map(this.snapshot().nodes.map((n) => [n.id, n]));
    return this.snapshot().edges
      .filter((e) => e.type === 'parent-of' && e.fromObjectId === id)
      .map((e) => byId.get(e.toObjectId))
      .filter((n): n is IdeaObject => !!n)
      .map((n) => ({ id: n.id, displayId: n.displayId, title: n.title }));
  });
  readonly bomDiff = computed(() => {
    const vers = this.versions();
    if (vers.length < 2) {
      return null;
    }
    const a = componentIds(vers[vers.length - 2]);
    const b = componentIds(vers[vers.length - 1]);
    return {
      added: b.filter((x) => !a.includes(x)),
      dropped: a.filter((x) => !b.includes(x)),
    };
  });
  readonly imageUrl = computed(() => {
    const images = this.attachments.forObject(this.object().id).filter((a) => (a.contentType || '').startsWith('image/'));
    if (!images.length) {
      return null;
    }
    return this.api.attachmentContentUrl(this.workspaceId(), images[0].id);
  });

  ngOnInit() {
    this.refresh();
  }

  ngOnChanges() {
    this.refresh();
  }

  private refresh() {
    this.hydrate();
    this.api.objectVersions(this.workspaceId(), this.object().id).subscribe({
      next: (rows) => this.versions.set(rows ?? []),
      error: () => this.versions.set([]),
    });
  }

  hydrate() {
    const details = this.object().details ?? {};
    const rows = Array.isArray(details['inputs']) ? (details['inputs'] as Record<string, unknown>[]) : [];
    this.inputs.set(
      rows.map((r) => ({
        name: String(r['name'] ?? ''),
        value: String(r['value'] ?? ''),
        unit: String(r['unit'] ?? ''),
        sourceObjectId: String(r['sourceObjectId'] ?? ''),
      })),
    );
    if (!this.inputs().length && this.object().type === 'calculation') {
      this.inputs.set([{ name: '', value: '', unit: '', sourceObjectId: '' }]);
    }
    this.method = String(details['method'] ?? '');
    const output = (details['output'] as Record<string, unknown> | undefined) ?? {};
    this.outputValue = String(output['value'] ?? '');
    this.outputUnit = String(output['unit'] ?? '');
    this.observedAt = String(details['observedAt'] ?? '').slice(0, 10);
    this.setup = String(details['setup'] ?? '');
    this.result = String(details['result'] ?? '');
    this.choice = String(details['choice'] ?? this.object().title);
    this.reason = String(details['reason'] ?? '');
    const alts = details['alternatives'];
    this.alternatives = Array.isArray(alts) ? alts.map(String).join(', ') : String(alts ?? '');
    this.regions.set(Array.isArray(details['regions']) ? (details['regions'] as ArtifactRegion[]) : []);
  }

  saveCalculation() {
    const filled = this.inputs().filter((r) => r.name.trim());
    this.api
      .updateObject(this.workspaceId(), this.object().id, {
        details: {
          inputs: filled,
          method: this.method,
          output: { value: this.outputValue, unit: this.outputUnit },
        },
        newVersion: true,
      })
      .subscribe(() => this.changed.emit());
  }

  saveBench() {
    this.api
      .updateObject(this.workspaceId(), this.object().id, {
        details: {
          observedAt: this.observedAt,
          setup: this.setup,
          result: this.result,
          bearsOn: this.bearsOnKind === 'contradicts' ? 'weakens' : 'supports',
        },
        newVersion: true,
      })
      .subscribe(() => {
        if (this.bearsOnId) {
          this.api
            .createEdge(this.workspaceId(), {
              type: this.bearsOnKind,
              fromObjectId: this.object().id,
              toObjectId: this.bearsOnId,
              why: 'bench note',
            })
            .subscribe({ next: () => this.changed.emit(), error: () => this.changed.emit() });
          return;
        }
        this.changed.emit();
      });
  }

  saveDecision() {
    this.api
      .updateObject(this.workspaceId(), this.object().id, {
        details: {
          choice: this.choice,
          reason: this.reason,
          alternatives: this.alternatives
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        newVersion: true,
      })
      .subscribe(() => this.changed.emit());
  }

  addPart() {
    const title = this.newPart.trim();
    if (!title) {
      return;
    }
    this.api.addComponent(this.workspaceId(), this.object().id, title).subscribe(() => {
      this.newPart = '';
      this.changed.emit();
    });
  }

  searchReuse() {
    this.api.similar(this.workspaceId(), this.reuseQuery).subscribe({
      next: (rows) => this.reuseHits.set(rows ?? []),
      error: () => this.reuseHits.set([]),
    });
  }

  regionStart(ev: PointerEvent) {
    const box = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.regionDraft = {
      id: 'r' + Date.now(),
      label: 'region',
      x: ((ev.clientX - box.left) / box.width) * 100,
      y: ((ev.clientY - box.top) / box.height) * 100,
      w: 0,
      h: 0,
    };
  }

  regionEnd(ev: PointerEvent) {
    if (!this.regionDraft) {
      return;
    }
    const box = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const x2 = ((ev.clientX - box.left) / box.width) * 100;
    const y2 = ((ev.clientY - box.top) / box.height) * 100;
    const r = this.regionDraft;
    r.w = Math.max(2, x2 - r.x);
    r.h = Math.max(2, y2 - r.y);
    this.regions.update((list) => [...list, r]);
    this.regionDraft = null;
  }

  saveRegions() {
    const last = this.regions().at(-1);
    if (last && this.regionClaimId) {
      last.claimObjectId = this.regionClaimId;
    }
    this.api
      .updateObject(this.workspaceId(), this.object().id, { details: { regions: this.regions() }, newVersion: true })
      .subscribe(() => this.changed.emit());
  }

  openRegion(region: ArtifactRegion) {
    if (!region.claimObjectId) {
      return;
    }
    const found = this.snapshot().nodes.find((n) => n.id === region.claimObjectId);
    if (found) {
      this.focus.emit(found);
    }
  }

  versionChoice(version: ObjectVersion): string {
    const details = version.details ?? {};
    const choice = details['choice'] ? String(details['choice']) : version.title;
    const reason = details['reason'] ? String(details['reason']) : version.summary;
    return [choice, reason].filter(Boolean).join(' — ');
  }
}

function componentIds(version: ObjectVersion): string[] {
  const raw = version.details?.['components'];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((row) => {
    if (row && typeof row === 'object' && 'displayId' in row) {
      return String((row as { displayId?: string }).displayId);
    }
    return String(row);
  });
}
