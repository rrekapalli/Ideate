import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MtIconComponent } from '../../icons/mt-icon.component';

export type MtButtonVariant = 'text' | 'outlined' | 'filled' | 'icon';

@Component({
  selector: 'mt-button',
  standalone: true,
  imports: [MtIconComponent],
  template: `
    <button
      class="mt-btn"
      [class.mt-btn--text]="variant() === 'text'"
      [class.mt-btn--outlined]="variant() === 'outlined'"
      [class.mt-btn--filled]="variant() === 'filled'"
      [class.mt-btn--icon]="variant() === 'icon'"
      [class.mt-btn--sm]="size() === 'sm'"
      [disabled]="disabled()"
      [attr.type]="type()"
      [attr.aria-label]="ariaLabel() || null"
      (click)="clicked.emit($event)"
    >
      @if (icon()) {
        <mt-icon [name]="icon()!" [spin]="iconSpin()" [size]="size() === 'sm' ? 14 : 16" />
      }
      @if (label()) {
        <span class="mt-btn__label">{{ label() }}</span>
      }
      <ng-content />
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .mt-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        font: inherit;
        font-size: var(--mt-fs, 0.8125rem);
        line-height: 1.2;
        padding: var(--mt-button-padding, var(--button-padding, 0.2rem 0.55rem));
        min-height: var(--mt-control-height, 1.75rem);
        border-radius: var(--mt-corner-radius, 1px);
        border: 1px solid transparent;
        cursor: pointer;
        color: var(--mt-text, #212121);
        background: transparent;
        box-sizing: border-box;
      }
      .mt-btn:focus-visible {
        outline: none;
        box-shadow: var(--mt-focus-ring);
      }
      .mt-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mt-btn--filled {
        background: var(--mt-primary, #10b981);
        color: var(--mt-on-primary, #fff);
      }
      .mt-btn--filled:hover:not(:disabled) {
        background: var(--mt-primary-hover, #059669);
      }
      .mt-btn--outlined {
        border-color: var(--mt-surface-border, #e5e7eb);
        background: var(--mt-surface-card, #fff);
      }
      .mt-btn--outlined:hover:not(:disabled) {
        border-color: var(--mt-primary, #10b981);
        color: var(--mt-primary, #10b981);
      }
      .mt-btn--text {
        background: transparent;
        color: var(--mt-primary, #10b981);
      }
      .mt-btn--text:hover:not(:disabled) {
        background: color-mix(in srgb, var(--mt-primary, #10b981) 12%, transparent);
      }
      .mt-btn--icon {
        padding: 0.25rem;
        min-width: var(--mt-control-height, 1.75rem);
      }
      .mt-btn--sm {
        min-height: var(--mt-control-height, 1.75rem);
        padding: var(--mt-button-padding, 0.2rem 0.55rem);
        font-size: var(--mt-fs, 0.8125rem);
      }
      .mt-btn--icon.mt-btn--sm {
        padding: 0.25rem;
        min-width: var(--mt-control-height, 1.75rem);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtButtonComponent {
  readonly label = input<string | undefined>(undefined);
  readonly icon = input<string | undefined>(undefined);
  readonly iconSpin = input(false);
  readonly variant = input<MtButtonVariant>('filled');
  readonly size = input<'sm' | 'md'>('md');
  readonly disabled = input(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly clicked = output<MouseEvent>();
}
