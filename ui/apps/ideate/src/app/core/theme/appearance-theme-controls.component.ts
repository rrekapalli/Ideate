import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MtToggleComponent,
  type MtAccentId,
  type MtAppearancePreference,
  type MtColorMode,
  type MtFontFamily,
  type MtThemeFamily,
} from '@ideate/ui';

const MODES: { id: MtColorMode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

const FAMILIES: { id: MtThemeFamily; label: string }[] = [
  { id: 'aura', label: 'Aura' },
  { id: 'lara', label: 'Lara' },
  { id: 'nora', label: 'Nora' },
];

const FONT_FAMILIES: { id: MtFontFamily; label: string }[] = [
  { id: 'system', label: 'System UI' },
  { id: 'inter', label: 'Inter' },
];

const ACCENTS: MtAccentId[] = ['emerald', 'green', 'blue', 'teal', 'sky', 'orange', 'violet', 'rose'];

@Component({
  selector: 'ideate-appearance-theme-controls',
  imports: [FormsModule, MtToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="appearance-controls" role="group" aria-label="Appearance">
      <div class="appearance-controls__section">
        <div class="appearance-controls__label">Color mode</div>
        <div class="appearance-controls__chips">
          @for (m of modes; track m.id) {
            <button type="button" class="theme-chip" [class.theme-chip--active]="preference().colorMode === m.id" (click)="setMode(m.id)">
              {{ m.label }}
            </button>
          }
        </div>
      </div>
      <div class="appearance-controls__section">
        <div class="appearance-controls__label">Theme family</div>
        <div class="appearance-controls__chips">
          @for (f of families; track f.id) {
            <button type="button" class="theme-chip" [class.theme-chip--active]="preference().themeFamily === f.id" (click)="emit({ themeFamily: f.id })">
              {{ f.label }}
            </button>
          }
        </div>
      </div>
      <div class="appearance-controls__section">
        <div class="appearance-controls__label">Accent</div>
        <div class="appearance-controls__accents">
          @for (a of accents; track a) {
            <button
              type="button"
              class="theme-accent"
              [class.theme-accent--active]="preference().accentPalette === a"
              [attr.data-accent]="a"
              [attr.aria-label]="a"
              (click)="emit({ accentPalette: a })"
            ></button>
          }
        </div>
      </div>
      <div class="appearance-controls__section">
        <div class="appearance-controls__label">Font family</div>
        <div class="appearance-controls__chips">
          @for (f of fontFamilies; track f.id) {
            <button type="button" class="theme-chip" [class.theme-chip--active]="preference().fontFamily === f.id" (click)="emit({ fontFamily: f.id })">
              {{ f.label }}
            </button>
          }
        </div>
      </div>
      <div class="appearance-controls__section">
        <div class="appearance-controls__label">Font size</div>
        <div class="appearance-controls__font">
          <input
            type="number"
            class="appearance-controls__font-input"
            [ngModel]="preference().fontSize"
            (ngModelChange)="setFontSize($event)"
            min="0.75"
            max="2.5"
            step="0.05"
            aria-label="Application-wide base font size in rem"
          />
          <span class="appearance-controls__font-hint">rem (0.75–2.5)</span>
        </div>
      </div>
      <div class="appearance-controls__section appearance-controls__row">
        <span class="appearance-controls__label">Frosted glass</span>
        <mt-toggle [ngModel]="preference().glassEffect" (ngModelChange)="emit({ glassEffect: $event })" ariaLabel="Enable frosted glass effect" />
      </div>
    </div>
  `,
  styles: `
    .appearance-controls { display: flex; flex-direction: column; gap: 0.85rem; max-width: 22rem; }
    .appearance-controls__section { display: flex; flex-direction: column; gap: 0.4rem; }
    .appearance-controls__row { flex-direction: row; align-items: center; justify-content: space-between; }
    .appearance-controls__label {
      font-size: 0.75rem; font-weight: 600; color: var(--mt-text-muted, var(--text-color-secondary));
      text-transform: uppercase; letter-spacing: 0.03em;
    }
    .appearance-controls__chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .theme-chip {
      border: 1px solid var(--mt-surface-border, var(--surface-border));
      background: transparent; color: var(--mt-text, var(--text-color));
      border-radius: var(--mt-panel-border-radius, 1px);
      padding: 0.3rem 0.55rem; font: inherit; font-size: 0.8rem; cursor: pointer;
    }
    .theme-chip--active {
      color: var(--mt-primary, var(--primary-color));
      background: var(--mt-nav-active-bg);
      border-color: var(--mt-primary, var(--primary-color));
      font-weight: 700;
    }
    .appearance-controls__accents { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .theme-accent { width: 1.35rem; height: 1.35rem; border-radius: 999px; border: 2px solid transparent; cursor: pointer; padding: 0; }
    .theme-accent--active { border-color: var(--mt-text); box-shadow: 0 0 0 2px var(--mt-surface-card); }
    .theme-accent[data-accent='emerald'] { background: #10b981; }
    .theme-accent[data-accent='green'] { background: #22c55e; }
    .theme-accent[data-accent='blue'] { background: #3b82f6; }
    .theme-accent[data-accent='teal'] { background: #14b8a6; }
    .theme-accent[data-accent='sky'] { background: #0ea5e9; }
    .theme-accent[data-accent='orange'] { background: #f97316; }
    .theme-accent[data-accent='violet'] { background: #8b5cf6; }
    .theme-accent[data-accent='rose'] { background: #f43f5e; }
    .appearance-controls__font { display: flex; align-items: center; gap: 0.5rem; }
    .appearance-controls__font-input {
      width: 5.5rem; padding: 0.35rem 0.5rem;
      border: 1px solid var(--mt-surface-border); border-radius: var(--mt-panel-border-radius, 1px);
      background: var(--mt-input-bg); color: var(--mt-text); font: inherit; font-size: 0.875rem;
    }
    .appearance-controls__font-hint { font-size: 0.75rem; color: var(--mt-text-muted); }
  `,
})
export class AppearanceThemeControlsComponent {
  readonly preference = input.required<MtAppearancePreference>();
  readonly preferenceChange = output<MtAppearancePreference>();
  readonly modes = MODES;
  readonly families = FAMILIES;
  readonly fontFamilies = FONT_FAMILIES;
  readonly accents = ACCENTS;

  setMode(colorMode: MtColorMode): void {
    this.emit({ colorMode });
  }

  setFontSize(raw: string | number): void {
    const n = Math.min(2.5, Math.max(0.75, Number(raw) || 1));
    this.emit({ fontSize: Math.round(n * 100) / 100 });
  }

  emit(partial: Partial<MtAppearancePreference>): void {
    this.preferenceChange.emit({ ...this.preference(), ...partial });
  }
}
