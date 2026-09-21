import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface MtSelectOption {
  label: string;
  value: string | number | boolean | null;
  disabled?: boolean;
}

@Component({
  selector: 'mt-select',
  standalone: true,
  template: `
    <div class="mt-select" [class.mt-select--open]="open()">
      <button
        type="button"
        class="mt-select__trigger"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        (click)="toggle()"
      >
        <span class="mt-select__value">{{ displayLabel() }}</span>
        <span class="mt-select__chev" aria-hidden="true">▾</span>
      </button>
      @if (open()) {
        <div class="mt-select__panel" role="listbox">
          @if (filterable()) {
            <input
              class="mt-select__filter"
              type="search"
              [placeholder]="filterPlaceholder()"
              [value]="filter()"
              (input)="filter.set(($any($event.target)).value)"
            />
          }
          <ul class="mt-select__list">
            @for (opt of filtered(); track trackOpt(opt)) {
              <li>
                <button
                  type="button"
                  class="mt-select__option"
                  role="option"
                  [attr.aria-selected]="isSelected(opt)"
                  [disabled]="opt.disabled"
                  (click)="pick(opt)"
                >
                  {{ opt.label }}
                </button>
              </li>
            } @empty {
              <li class="mt-select__empty">No options</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .mt-select {
        position: relative;
        display: block;
        width: 100%;
      }
      .mt-select__trigger {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        min-width: 8rem;
        width: 100%;
        font: inherit;
        font-size: calc(0.875rem / var(--font-size, 1rem));
        padding: var(--mt-input-padding, 0.2rem 0.375rem);
        min-height: var(--mt-control-height, 1.75rem);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        background: var(--mt-input-bg, #fff);
        color: var(--mt-text, #212121);
        cursor: pointer;
        box-sizing: border-box;
      }
      .mt-select__trigger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mt-select__panel {
        position: absolute;
        z-index: 20;
        left: 0;
        right: 0;
        top: calc(100% + 2px);
        max-height: 16rem;
        overflow: auto;
        background: var(--mt-surface-card, #fff);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      }
      .mt-select__filter {
        width: 100%;
        box-sizing: border-box;
        border: 0;
        border-bottom: 1px solid var(--mt-surface-border, #e5e7eb);
        padding: 0.35rem 0.5rem;
        font: inherit;
        background: var(--mt-input-bg, #fff);
        color: var(--mt-text, #212121);
      }
      .mt-select__list {
        list-style: none;
        margin: 0;
        padding: 0.2rem 0;
      }
      .mt-select__option {
        width: 100%;
        text-align: left;
        border: 0;
        background: transparent;
        font: inherit;
        padding: 0.35rem 0.6rem;
        cursor: pointer;
        color: var(--mt-text, #212121);
      }
      .mt-select__option:hover:not(:disabled),
      .mt-select__option[aria-selected='true'] {
        background: color-mix(in srgb, var(--mt-primary, #10b981) 14%, var(--mt-surface-card));
      }
      .mt-select__empty {
        padding: 0.5rem 0.6rem;
        color: var(--mt-text-muted);
        font-size: 0.8rem;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MtSelectComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtSelectComponent implements ControlValueAccessor {
  readonly options = input<MtSelectOption[]>([]);
  readonly placeholder = input('Select…');
  readonly filterable = input(false);
  readonly filterPlaceholder = input('Filter');
  readonly disabled = input(false);
  readonly value = model<string | number | boolean | null>(null);
  readonly open = signal(false);
  readonly filter = signal('');

  private onChange: (v: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  readonly filtered = computed(() => {
    const q = this.filter().trim().toLowerCase();
    const opts = this.options();
    if (!q) {
      return opts;
    }
    return opts.filter((o) => o.label.toLowerCase().includes(q));
  });

  readonly displayLabel = computed(() => {
    const v = this.value();
    const hit = this.options().find((o) => o.value === v);
    return hit?.label ?? this.placeholder();
  });

  trackOpt(opt: MtSelectOption): string {
    return `${String(opt.value)}:${opt.label}`;
  }

  isSelected(opt: MtSelectOption): boolean {
    return this.value() === opt.value;
  }

  writeValue(v: unknown): void {
    this.value.set((v as string | number | boolean | null) ?? null);
  }
  registerOnChange(fn: (v: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.open.update((o) => !o);
    if (!this.open()) {
      this.onTouched();
    } else {
      this.filter.set('');
    }
  }

  pick(opt: MtSelectOption): void {
    if (opt.disabled) {
      return;
    }
    this.value.set(opt.value);
    this.onChange(opt.value);
    this.open.set(false);
    this.onTouched();
  }
}
