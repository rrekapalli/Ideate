import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MtSeverity } from '../tag/mt-tag.component';

@Component({
  selector: 'mt-badge',
  standalone: true,
  template: `<span class="mt-badge" [attr.data-severity]="severity()">{{ value() }}</span>`,
  styles: [
    `
      .mt-badge {
        display: inline-flex;
        min-width: 1.1rem;
        height: 1.1rem;
        padding: 0 0.3rem;
        border-radius: 999px;
        align-items: center;
        justify-content: center;
        font-size: 0.65rem;
        font-weight: 700;
        background: var(--mt-primary);
        color: var(--mt-on-primary, #fff);
      }
      .mt-badge[data-severity='danger'] { background: var(--mt-severity-danger); }
      .mt-badge[data-severity='warn'] { background: var(--mt-severity-warn); }
      .mt-badge[data-severity='success'] { background: var(--mt-severity-success); }
      .mt-badge[data-severity='info'] { background: var(--mt-severity-info); }
      .mt-badge[data-severity='secondary'] { background: var(--mt-severity-secondary); }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtBadgeComponent {
  readonly value = input<string | number>('');
  readonly severity = input<MtSeverity>('info');
}
