import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'mt-progress',
  standalone: true,
  template: `
    <span
      class="mt-progress"
      [class.mt-progress--sm]="size() === 'sm'"
      [class.mt-progress--lg]="size() === 'lg'"
      role="status"
      [attr.aria-label]="ariaLabel()"
    >
      <span class="mt-progress__ring" aria-hidden="true"></span>
    </span>
  `,
  styles: [
    `
      .mt-progress {
        display: inline-flex;
        width: 2rem;
        height: 2rem;
      }
      .mt-progress--sm {
        width: 1.25rem;
        height: 1.25rem;
      }
      .mt-progress--lg {
        width: 3rem;
        height: 3rem;
      }
      .mt-progress__ring {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        border: 0.2em solid color-mix(in srgb, var(--mt-primary, #10b981) 25%, transparent);
        border-top-color: var(--mt-primary, #10b981);
        border-radius: 50%;
        animation: mt-progress-spin 0.7s linear infinite;
      }
      @keyframes mt-progress-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtProgressComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly ariaLabel = input('Loading');
}
