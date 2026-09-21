import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type MtSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

@Component({
  selector: 'mt-tag',
  standalone: true,
  template: `<span class="mt-tag" [attr.data-severity]="severity()">{{ value() }}<ng-content /></span>`,
  styles: [
    `
      .mt-tag {
        display: inline-flex;
        align-items: center;
        padding: 0.1rem 0.4rem;
        border-radius: var(--mt-corner-radius, 1px);
        font-size: calc(0.75rem / var(--font-size, 1rem));
        line-height: 1.3;
        font-weight: 600;
        background: color-mix(in srgb, var(--sev, var(--mt-severity-secondary)) 18%, var(--mt-surface-card));
        color: var(--sev, var(--mt-severity-secondary));
        border: 1px solid color-mix(in srgb, var(--sev, var(--mt-severity-secondary)) 35%, transparent);
      }
      .mt-tag[data-severity='success'] { --sev: var(--mt-severity-success); }
      .mt-tag[data-severity='info'] { --sev: var(--mt-severity-info); }
      .mt-tag[data-severity='warn'] { --sev: var(--mt-severity-warn); }
      .mt-tag[data-severity='danger'] { --sev: var(--mt-severity-danger); }
      .mt-tag[data-severity='secondary'] { --sev: var(--mt-severity-secondary); }
      .mt-tag[data-severity='contrast'] {
        background: var(--mt-text);
        color: var(--mt-surface-card);
        border-color: var(--mt-text);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtTagComponent {
  readonly value = input('');
  readonly severity = input<MtSeverity>('secondary');
}
