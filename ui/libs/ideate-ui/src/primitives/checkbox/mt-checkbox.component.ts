import { ChangeDetectionStrategy, Component, forwardRef, input, model } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'mt-checkbox',
  standalone: true,
  template: `
    <label class="mt-check">
      <input
        type="checkbox"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="toggle(($any($event.target)).checked)"
      />
      <span class="mt-check__box" aria-hidden="true"></span>
      @if (label()) {
        <span class="mt-check__label">{{ label() }}</span>
      }
      <ng-content />
    </label>
  `,
  styles: [
    `
      .mt-check {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
        font: inherit;
        font-size: calc(0.875rem / var(--font-size, 1rem));
      }
      .mt-check input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }
      .mt-check__box {
        width: 0.95rem;
        height: 0.95rem;
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        background: var(--mt-input-bg, #fff);
        box-sizing: border-box;
      }
      .mt-check input:checked + .mt-check__box {
        background: var(--mt-primary, #10b981);
        border-color: var(--mt-primary, #10b981);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E");
        background-size: 12px 12px;
        background-repeat: no-repeat;
        background-position: center;
      }
      .mt-check input:focus-visible + .mt-check__box {
        box-shadow: var(--mt-focus-ring);
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MtCheckboxComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtCheckboxComponent implements ControlValueAccessor {
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
  toggle(v: boolean): void {
    this.checked.set(v);
    this.onChange(v);
    this.onTouched();
  }
}
