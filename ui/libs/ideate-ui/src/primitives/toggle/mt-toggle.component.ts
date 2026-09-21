import { ChangeDetectionStrategy, Component, forwardRef, input, model } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'mt-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      class="mt-toggle"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="toggle()"
    >
      <span class="mt-toggle__track"><span class="mt-toggle__thumb"></span></span>
      @if (label()) {
        <span class="mt-toggle__label">{{ label() }}</span>
      }
    </button>
  `,
  styles: [
    `
      .mt-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        border: 0;
        background: transparent;
        cursor: pointer;
        font: inherit;
        padding: 0;
        color: var(--mt-text, #212121);
      }
      .mt-toggle__track {
        width: 1.75rem;
        height: 1rem;
        border-radius: 999px;
        background: var(--mt-surface-border, #e5e7eb);
        position: relative;
        transition: background 120ms;
      }
      .mt-toggle__thumb {
        position: absolute;
        top: 1px;
        left: 1px;
        width: calc(1rem - 2px);
        height: calc(1rem - 2px);
        border-radius: 50%;
        background: #fff;
        transition: transform 120ms;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      }
      .mt-toggle[aria-checked='true'] .mt-toggle__track {
        background: var(--mt-primary, #10b981);
      }
      .mt-toggle[aria-checked='true'] .mt-toggle__thumb {
        transform: translateX(0.75rem);
      }
      .mt-toggle:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mt-toggle__label {
        font-size: calc(0.875rem / var(--font-size, 1rem));
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MtToggleComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtToggleComponent implements ControlValueAccessor {
  readonly label = input<string | undefined>(undefined);
  readonly disabled = input(false);
  readonly checked = model(false);
  private onChange: (v: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(v: boolean): void {
    this.checked.set(!!v);
  }
  registerOnChange(fn: (v: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  toggle(): void {
    if (this.disabled()) return;
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
    this.onTouched();
  }
}
