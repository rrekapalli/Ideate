import { ChangeDetectionStrategy, Component, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'mt-field',
  standalone: true,
  template: `
    <label class="mt-field" [class.mt-field--disabled]="disabled()">
      @if (label()) {
        <span class="mt-field__label">{{ label() }}</span>
      }
      @switch (type()) {
        @case ('textarea') {
          <textarea
            class="mt-field__control"
            [attr.id]="inputId()"
            [attr.rows]="rows()"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [readOnly]="readonly()"
            [required]="required()"
            [value]="value()"
            (input)="onInput(($any($event.target)).value)"
            (blur)="onTouched()"
          ></textarea>
        }
        @default {
          <input
            class="mt-field__control"
            [attr.id]="inputId()"
            [attr.type]="type()"
            [attr.min]="min()"
            [attr.max]="max()"
            [attr.step]="step()"
            [placeholder]="placeholder()"
            [disabled]="disabled()"
            [readOnly]="readonly()"
            [required]="required()"
            [value]="value()"
            (input)="onInput(($any($event.target)).value)"
            (blur)="onTouched()"
          />
        }
      }
      @if (hint()) {
        <span class="mt-field__hint">{{ hint() }}</span>
      }
    </label>
  `,
  styles: [
    `
      .mt-field {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        font: inherit;
      }
      .mt-field__label {
        font-size: var(--mt-fs-sm, 0.75rem);
        color: var(--mt-text, #212121);
      }
      .mt-field__control {
        font: inherit;
        font-size: var(--mt-fs, 0.8125rem);
        padding: var(--mt-input-padding, var(--input-padding, 0.2rem 0.4rem));
        min-height: var(--mt-control-height, 1.75rem);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        background: var(--mt-input-bg, #fff);
        color: var(--mt-text, #212121);
        box-sizing: border-box;
        width: 100%;
      }
      .mt-field__control:focus-visible {
        outline: none;
        box-shadow: var(--mt-focus-ring);
        border-color: var(--mt-primary, #10b981);
      }
      .mt-field__hint {
        font-size: var(--mt-fs-sm, 0.75rem);
        color: var(--mt-text-muted, #6c757d);
      }
      .mt-field--disabled {
        opacity: 0.6;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MtFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtFieldComponent implements ControlValueAccessor {
  readonly label = input<string | undefined>(undefined);
  readonly inputId = input<string | undefined>(undefined);
  readonly placeholder = input('');
  readonly hint = input<string | undefined>(undefined);
  readonly type = input<'text' | 'textarea' | 'number' | 'password' | 'date'>('text');
  readonly rows = input(3);
  readonly min = input<string | number | undefined>(undefined);
  readonly max = input<string | number | undefined>(undefined);
  readonly step = input<string | number | undefined>(undefined);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly disabled = model(false);
  readonly value = signal('');

  private onChange: (v: string | number) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(v: unknown): void {
    this.value.set(v == null ? '' : String(v));
  }
  registerOnChange(fn: (v: string | number) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(raw: string): void {
    this.value.set(raw);
    if (this.type() === 'number') {
      const n = raw === '' ? '' : Number(raw);
      this.onChange(n as number);
    } else {
      this.onChange(raw);
    }
  }
}
