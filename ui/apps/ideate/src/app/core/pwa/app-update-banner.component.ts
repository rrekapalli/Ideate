import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MtButtonComponent, MtIconComponent } from '@ideate/ui';
import { AppUpdateService } from './app-update.service';

@Component({
  selector: 'app-update-banner',
  standalone: true,
  imports: [MtButtonComponent, MtIconComponent],
  template: `
    @if (updates.showDownloadBanner()) {
      <div class="app-update-banner app-update-banner--info" role="status" aria-live="polite">
        <span class="app-update-banner__text">
          <mt-icon name="spinner" [spin]="true" [size]="16" />
          Downloading a new version…
        </span>
      </div>
    } @else if (updates.showUpdateReadyBanner()) {
      <div class="app-update-banner" role="alert" aria-live="polite">
        <span class="app-update-banner__text">A new version of Ideate is ready.</span>
        <div class="app-update-banner__actions">
          <mt-button
            label="Restart"
            icon="refresh"
            variant="filled"
            size="sm"
            (clicked)="restart()"
          />
          <mt-button label="Later" variant="text" size="sm" (clicked)="updates.dismiss()" />
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .app-update-banner {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 11000;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: var(--mt-primary, var(--p-primary-color));
        color: var(--mt-on-primary, var(--p-primary-contrast-color, #fff));
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.18);
      }

      .app-update-banner__text {
        flex: 1 1 12rem;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .app-update-banner__actions {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        flex-shrink: 0;
      }

      .app-update-banner--info {
        justify-content: center;
        background: color-mix(in srgb, var(--mt-primary, var(--p-primary-color)) 92%, #000);
      }

      .app-update-banner--info .app-update-banner__text {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        flex: none;
        text-align: center;
      }
    `,
  ],
})
export class AppUpdateBannerComponent {
  readonly updates = inject(AppUpdateService);

  restart(): void {
    this.updates.applyUpdate(true);
  }
}
