import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { type MtAppearancePreference } from '@ideate/ui';
import { AppearanceThemeControlsComponent } from '../core/theme/appearance-theme-controls.component';
import { ThemeService } from '../core/theme/theme.service';

type SettingsTab = 'workspace' | 'appearance' | 'usage';

@Component({
  selector: 'ideate-settings-page',
  imports: [AppearanceThemeControlsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="settings">
      <nav class="settings-tabs" aria-label="Settings sections">
        <button type="button" [class.active]="tab() === 'workspace'" (click)="tab.set('workspace')">Workspace</button>
        <button type="button" [class.active]="tab() === 'appearance'" (click)="tab.set('appearance')">Appearance</button>
        <button type="button" [class.active]="tab() === 'usage'" (click)="tab.set('usage')">Usage</button>
      </nav>
      <div class="settings-body">
        @switch (tab()) {
          @case ('workspace') {
            <dl class="facts">
              <div>
                <dt>Name</dt>
                <dd>{{ name() }}</dd>
              </div>
              <div>
                <dt>Persona</dt>
                <dd>{{ persona() }}</dd>
              </div>
              <div>
                <dt>Branch</dt>
                <dd>{{ branch() }}</dd>
              </div>
            </dl>
          }
          @case ('appearance') {
            <ideate-appearance-theme-controls [preference]="pref" (preferenceChange)="onPreferenceChange($event)" />
          }
          @case ('usage') {
            <dl class="facts">
              <div>
                <dt>Credits</dt>
                <dd>{{ credits() }}</dd>
              </div>
              <div>
                <dt>Usage</dt>
                <dd>{{ usageMinor() }} minor INR</dd>
              </div>
              <div>
                <dt>Auth</dt>
                <dd>Dev bypass is on</dd>
              </div>
            </dl>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; overflow: auto; }
    .settings { padding: 0.75rem 1rem 1.25rem; max-width: 40rem; }
    .settings-tabs {
      display: flex; gap: 0.25rem; margin-bottom: 1rem;
      border-bottom: 1px solid var(--mt-surface-border, var(--surface-border));
    }
    .settings-tabs button {
      background: none; border: 0; border-bottom: 2px solid transparent;
      color: var(--mt-text-muted, var(--text-color-secondary));
      padding: 0.45rem 0.7rem; cursor: pointer; font: inherit; font-weight: 600;
      margin-bottom: -1px;
    }
    .settings-tabs button.active {
      color: var(--mt-primary, var(--primary-color));
      border-bottom-color: var(--mt-primary, var(--primary-color));
    }
    .facts { display: grid; gap: 0.85rem; margin: 0; }
    .facts div { display: grid; gap: 0.15rem; }
    dt {
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em;
      color: var(--mt-text-muted, var(--text-color-secondary));
    }
    dd { margin: 0; font-weight: 600; }
  `,
})
export class SettingsPageComponent {
  private readonly theme = inject(ThemeService);
  readonly name = input('');
  readonly persona = input('');
  readonly branch = input('');
  readonly credits = input(0);
  readonly usageMinor = input(0);
  readonly tab = signal<SettingsTab>('workspace');
  pref: MtAppearancePreference = this.theme.getLastApplied();

  onPreferenceChange(next: MtAppearancePreference): void {
    this.pref = this.theme.setAppearance(next);
  }
}
