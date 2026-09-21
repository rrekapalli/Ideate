import { ChangeDetectionStrategy, Component, forwardRef, input, model } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'mt-radio',
  standalone: true,
  template: `
    <label class="mt-radio">
      <input
        type="radio"
        [name]="name()"
        [value]="value()"
        [checked]="selected() === value()"
        [disabled]="disabled()"
        (change)="select()"
      />
      <span class="mt-radio__dot" aria-hidden="true"></span>
      @if (label()) {
        <span>{{ label() }}</span>
      }
      <ng-content />
    </label>
  `,
  styles: [
    `
      .mt-radio {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
        font: inherit;
        font-size: calc(0.875rem / var(--font-size, 1rem));
      }
      .mt-radio input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }
      .mt-radio__dot {
        width: 0.95rem;
        height: 0.95rem;
        border-radius: 50%;
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        box-sizing: border-box;
        background: var(--mt-input-bg, #fff);
      }
      .mt-radio input:checked + .mt-radio__dot {
        border-color: var(--mt-primary, #10b981);
        box-shadow: inset 0 0 0 3px var(--mt-primary, #10b981);
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MtRadioComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtRadioComponent implements ControlValueAccessor {
  readonly name = input('mt-radio');
  readonly value = input.required<string>();
  readonly label = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly selected = model<string | null>(null);
  private onChange: (v: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(v: string): void {
    this.selected.set(v);
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  select(): void {
    this.selected.set(this.value());
    this.onChange(this.value());
    this.onTouched();
  }
}
