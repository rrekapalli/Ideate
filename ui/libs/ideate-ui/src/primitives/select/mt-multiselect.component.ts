import { ChangeDetectionStrategy, Component, computed, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import type { MtSelectOption } from './mt-select.component';

@Component({
  selector: 'mt-multiselect',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mt-multi" [class.mt-multi--open]="open()">
      <button type="button" class="mt-multi__trigger" [disabled]="disabled()" (click)="open.set(!open())">
        <span>{{ summary() }}</span>
        <span aria-hidden="true">▾</span>
      </button>
      @if (open()) {
        <div class="mt-multi__panel">
          @for (opt of options(); track trackOpt(opt)) {
            <label class="mt-multi__opt">
              <input
                type="checkbox"
                [checked]="isOn(opt)"
                [disabled]="!!opt.disabled || disabled()"
                (change)="toggle(opt, ($any($event.target)).checked)"
              />
              {{ opt.label }}
            </label>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .mt-multi {
        position: relative;
        display: block;
        width: 100%;
      }
      .mt-multi__trigger {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font: inherit;
        padding: var(--mt-input-padding, 0.2rem 0.375rem);
        min-height: var(--mt-control-height, 1.75rem);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        background: var(--mt-input-bg, #fff);
        color: var(--mt-text, #212121);
        cursor: pointer;
      }
      .mt-multi__panel {
        position: absolute;
        z-index: 20;
        left: 0;
        right: 0;
        top: calc(100% + 2px);
        max-height: 14rem;
        overflow: auto;
        background: var(--mt-surface-card, #fff);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        padding: 0.25rem 0;
      }
      .mt-multi__opt {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.55rem;
        font-size: calc(0.875rem / var(--font-size, 1rem));
        cursor: pointer;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MtMultiselectComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtMultiselectComponent implements ControlValueAccessor {
  readonly options = input<MtSelectOption[]>([]);
  readonly placeholder = input('Select…');
  readonly disabled = input(false);
  readonly value = model<Array<string | number | boolean | null>>([]);
  readonly open = signal(false);

  private onChange: (v: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  readonly summary = computed(() => {
    const selected = this.value();
    if (!selected.length) return this.placeholder();
    const labels = this.options()
      .filter((o) => selected.includes(o.value))
      .map((o) => o.label);
    return labels.join(', ') || this.placeholder();
  });

  trackOpt(opt: MtSelectOption): string {
    return `${String(opt.value)}:${opt.label}`;
  }

  isOn(opt: MtSelectOption): boolean {
    return this.value().includes(opt.value);
  }

  writeValue(v: unknown): void {
    this.value.set(Array.isArray(v) ? (v as Array<string | number | boolean | null>) : []);
  }
  registerOnChange(fn: (v: unknown) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  toggle(opt: MtSelectOption, on: boolean): void {
    const cur = [...this.value()];
    const idx = cur.findIndex((x) => x === opt.value);
    if (on && idx < 0) cur.push(opt.value);
    if (!on && idx >= 0) cur.splice(idx, 1);
    this.value.set(cur);
    this.onChange(cur);
    this.onTouched();
  }
}
