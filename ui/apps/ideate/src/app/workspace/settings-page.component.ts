import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { UsageEvent, UsageRollup, PERSONAS, lookupLabel } from '@ideate/api-client';
import { MtButtonComponent, MtTabComponent, MtTabsComponent, type MtAppearancePreference } from '@ideate/ui';
import { AppearanceThemeControlsComponent } from '../core/theme/appearance-theme-controls.component';
import { ThemeService } from '../core/theme/theme.service';

@Component({
  selector: 'ideate-settings-page',
  imports: [AppearanceThemeControlsComponent, MtTabsComponent, MtTabComponent, MtButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="hero">
        <div class="kicker">
          <span class="id">Settings</span>
          @if (persona()) {
            <span class="pill">{{ lookupLabel(persona()) }}</span>
          }
          @if (branch()) {
            <span class="pill">{{ branch() }}</span>
          }
        </div>
        <div class="hero-row">
          <h1>{{ name() || 'Workspace settings' }}</h1>
        </div>
      </header>

      <mt-tabs [value]="pane()" (valueChange)="pane.set($event + '')">
        <mt-tab value="workspace" label="Workspace">
          <div class="pane stats">
            <section>
              <h2>This workspace</h2>
              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{{ name() || '—' }}</dd>
                </div>
                <div>
                  <dt>Persona</dt>
                  <dd>
                    <select [value]="persona()" (change)="onPersona($event)" [attr.aria-label]="'Persona'">
                      @for (p of personas; track p) {
                        <option [value]="p">{{ lookupLabel(p) }}</option>
                      }
                    </select>
                    <p class="lead">Evidence stays evidence. This does not write a paper.</p>
                  </dd>
                </div>
                <div>
                  <dt>Handoff</dt>
                  <dd class="handoff">
                    <mt-button size="sm" variant="outlined" label="Clone to Researcher" (clicked)="clonePersona.emit('researcher')" />
                    <mt-button size="sm" variant="outlined" label="Clone to Inventor" (clicked)="clonePersona.emit('inventor')" />
                  </dd>
                </div>
                <div>
                  <dt>Active branch</dt>
                  <dd>{{ branch() || '—' }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </mt-tab>
        <mt-tab value="appearance" label="Appearance">
          <div class="pane stats">
            <section>
              <h2>Theme</h2>
              <p class="lead">Color, family, and type apply to this browser. They stay after refresh.</p>
              <div class="theme-wrap">
                <ideate-appearance-theme-controls [preference]="pref" (preferenceChange)="onPreferenceChange($event)" />
              </div>
            </section>
          </div>
        </mt-tab>
        <mt-tab value="usage" label="Usage">
          <div class="pane stats">
            <section>
              <h2>Tokens</h2>
              <div class="metrics">
                <div class="metric">
                  <span class="n">{{ totals().input }}</span>
                  <span class="l">input</span>
                </div>
                <div class="metric">
                  <span class="n">{{ totals().output }}</span>
                  <span class="l">output</span>
                </div>
                <div class="metric">
                  <span class="n">{{ totals().calls }}</span>
                  <span class="l">calls</span>
                </div>
                <div class="metric">
                  <span class="n">{{ rupees(totals().costMinor) }}</span>
                  <span class="l">est. INR</span>
                </div>
                <div class="metric">
                  <span class="n">{{ credits() }}</span>
                  <span class="l">credits</span>
                </div>
              </div>
            </section>
            <section>
              <h2>Account</h2>
              <dl>
                <div>
                  <dt>Credits</dt>
                  <dd>{{ credits() }}</dd>
                </div>
                <div>
                  <dt>Usage this workspace</dt>
                  <dd>{{ rupees(totals().costMinor) }} INR ({{ usageMinor() }} minor)</dd>
                </div>
                <div>
                  <dt>Auth</dt>
                  <dd>Dev bypass is on</dd>
                </div>
              </dl>
            </section>
            <section>
              <h2>All token events</h2>
              @if (events().length === 0) {
                <p class="lead">No AI token events in this workspace yet.</p>
              } @else {
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Model</th>
                      <th>In</th>
                      <th>Out</th>
                      <th>Est. INR</th>
                      <th>Job</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of events(); track row.id) {
                      <tr>
                        <td>{{ when(row.createdAt) }}</td>
                        <td>{{ row.model || row.provider }}</td>
                        <td>{{ row.inputTokens }}</td>
                        <td>{{ row.outputTokens }}</td>
                        <td>{{ rupees(row.estimatedCostMinor) }}</td>
                        <td class="mono">{{ row.jobClass }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
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
      overflow: auto;
      background: var(--mt-surface-card, #fff);
    }
    .hero { padding: 0.85rem 1.25rem 0.55rem; }
    .kicker { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 0.35rem; }
    .id {
      font-family: var(--font-family-mono, ui-monospace, monospace);
      font-weight: 700;
      color: var(--mt-primary, #10b981);
    }
    .pill {
      font-size: 0.72rem;
      color: var(--mt-text-muted);
      padding: 0.08rem 0.35rem;
      border: 1px solid var(--mt-surface-border, #e5e7eb);
      border-radius: 99px;
    }
    .hero-row { display: flex; gap: 1rem; align-items: flex-start; justify-content: space-between; }
    h1 { margin: 0; font-size: 1.45rem; line-height: 1.25; font-weight: 650; }
    .pane { padding: 0.75rem 1.35rem 1.6rem; max-width: 46rem; }
    .stats { display: flex; flex-direction: column; gap: 1.4rem; max-width: 52rem; }
    .stats h2 {
      margin: 0 0 0.65rem;
      font-size: 0.78rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--mt-text-muted);
    }
    .lead {
      margin: 0 0 0.85rem;
      font-size: 0.85rem;
      line-height: 1.45;
      color: var(--mt-text-muted);
    }
    dl { display: grid; gap: 0.45rem; margin: 0; }
    dl > div { display: grid; grid-template-columns: 9.5rem 1fr; gap: 0.6rem; font-size: 0.88rem; align-items: baseline; }
    dt { color: var(--mt-text-muted); }
    dd { margin: 0; font-weight: 650; }
    dd select { font: inherit; font-weight: 650; }
    .handoff { display: flex; flex-wrap: wrap; gap: 0.35rem; font-weight: 500; }
    .metrics { display: flex; flex-wrap: wrap; gap: 0.7rem; }
    .metric {
      min-width: 6.5rem;
      padding: 0.55rem 0.7rem;
      background: color-mix(in srgb, var(--mt-text) 5%, transparent);
      border-radius: var(--mt-panel-border-radius, 2px);
    }
    .metric .n { display: block; font-size: 1.15rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .metric .l { font-size: 0.7rem; color: var(--mt-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .theme-wrap {
      padding: 0.85rem 0.95rem;
      border: 1px solid var(--mt-surface-border, #e5e7eb);
      border-radius: var(--mt-panel-border-radius, 2px);
      background: color-mix(in srgb, var(--mt-text) 3%, transparent);
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { text-align: left; padding: 0.35rem 0.4rem; border-bottom: 1px solid var(--mt-surface-border, #e5e7eb); }
    th { color: var(--mt-text-muted); font-weight: 600; }
    .mono { font-family: var(--font-family-mono, ui-monospace, monospace); font-size: 0.78rem; word-break: break-all; }
  `,
})
export class SettingsPageComponent {
  private readonly theme = inject(ThemeService);
  readonly name = input('');
  readonly persona = input('');
  readonly branch = input('');
  readonly credits = input(0);
  readonly usageMinor = input(0);
  readonly usage = input<UsageRollup | null>(null);
  readonly personaChange = output<string>();
  readonly clonePersona = output<string>();
  readonly pane = signal('workspace');
  readonly lookupLabel = lookupLabel;
  readonly personas = PERSONAS;
  pref: MtAppearancePreference = this.theme.getLastApplied();

  readonly events = computed<UsageEvent[]>(() => this.usage()?.recent ?? []);

  readonly totals = computed(() => {
    const rows = this.events();
    const fromRows = {
      input: rows.reduce((s, r) => s + (r.inputTokens || 0), 0),
      output: rows.reduce((s, r) => s + (r.outputTokens || 0), 0),
      calls: rows.length,
      costMinor: rows.reduce((s, r) => s + (r.estimatedCostMinor || 0), 0),
    };
    const rollup = this.usage();
    return {
      input: rollup?.inputTokens ?? fromRows.input,
      output: rollup?.outputTokens ?? fromRows.output,
      calls: rollup?.calls ?? fromRows.calls,
      costMinor: rollup?.estimatedCostMinorInr ?? fromRows.costMinor,
    };
  });

  onPreferenceChange(next: MtAppearancePreference): void {
    this.pref = this.theme.setAppearance(next);
  }

  onPersona(ev: Event): void {
    const next = (ev.target as HTMLSelectElement).value;
    if (next && next !== this.persona()) {
      this.personaChange.emit(next);
    }
  }

  rupees(minor: number): string {
    return ((minor || 0) / 100).toFixed(2);
  }

  when(raw?: string): string {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}
