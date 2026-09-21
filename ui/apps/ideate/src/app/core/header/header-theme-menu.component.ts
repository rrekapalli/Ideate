import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { MtButtonComponent, type MtAppearancePreference } from '@ideate/ui';
import { AppearanceThemeControlsComponent } from '../theme/appearance-theme-controls.component';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'ideate-header-theme-menu',
  imports: [MtButtonComponent, AppearanceThemeControlsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="theme-menu" (click)="$event.stopPropagation()">
      <mt-button variant="icon" icon="palette" ariaLabel="Theme and appearance" (clicked)="togglePanel($event)" />
      @if (open) {
        <div class="theme-menu__panel" role="dialog" aria-label="Appearance">
          <ideate-appearance-theme-controls [preference]="pref" (preferenceChange)="onPreferenceChange($event)" />
        </div>
      }
    </div>
  `,
  styles: `
    .theme-menu { position: relative; display: inline-flex; align-items: center; }
    .theme-menu__panel {
      position: absolute; top: calc(100% + 0.4rem); right: 0; z-index: 1200;
      width: min(18.5rem, 92vw); padding: 0.75rem;
      border-radius: var(--mt-panel-border-radius, 1px);
      border: 1px solid var(--mt-surface-border, var(--surface-border));
      background: var(--mt-surface-card, var(--surface-card));
      box-shadow: var(--mt-shadow-md, var(--card-shadow));
    }
  `,
})
export class HeaderThemeMenuComponent {
  private readonly theme = inject(ThemeService);
  open = false;
  pref: MtAppearancePreference = this.theme.getLastApplied();

  togglePanel(event: Event): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) this.pref = this.theme.getLastApplied();
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.open = false;
  }

  onPreferenceChange(next: MtAppearancePreference): void {
    this.pref = this.theme.setAppearance(next);
  }
}
