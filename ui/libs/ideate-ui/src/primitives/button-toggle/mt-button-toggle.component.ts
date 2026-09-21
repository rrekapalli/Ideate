import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface MtButtonToggleOption {
  label: string;
  value: string;
}

@Component({
  selector: 'mt-button-toggle',
  standalone: true,
  template: `
    <div class="mt-btn-toggle" role="group">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          class="mt-btn-toggle__item"
          [class.mt-btn-toggle__item--active]="value() === opt.value"
          [disabled]="disabled()"
          (click)="select(opt.value)"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .mt-btn-toggle {
        display: inline-flex;
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        overflow: hidden;
      }
      .mt-btn-toggle__item {
        font: inherit;
        font-size: calc(0.8125rem / var(--font-size, 1rem));
        padding: 0.25rem 0.7rem;
        border: 0;
        background: var(--mt-surface-card, #fff);
        color: var(--mt-text, #212121);
        cursor: pointer;
      }
      .mt-btn-toggle__item--active {
        background: var(--mt-primary, #10b981);
        color: var(--mt-on-primary, #fff);
      }
      .mt-btn-toggle__item:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtButtonToggleComponent {
  readonly options = input<MtButtonToggleOption[]>([]);
  readonly disabled = input(false);
  readonly value = model<string | null>(null);

  select(v: string): void {
    if (this.disabled()) {
      return;
    }
    this.value.set(v);
  }
}
