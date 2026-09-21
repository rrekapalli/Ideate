import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'mt-dialog',
  standalone: true,
  template: `
    <div
      class="mt-dialog-root"
      [class.mt-dialog-root--open]="visible()"
      role="presentation"
      [attr.aria-hidden]="visible() ? null : 'true'"
    >
      <div class="mt-dialog-backdrop" (click)="onBackdrop()"></div>
      <div
        class="mt-dialog"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="header() ? 'mt-dialog-title' : null"
        [style.--mt-dialog-width]="width()"
      >
        @if (header()) {
          <div class="mt-dialog__header">
            <h2 id="mt-dialog-title" class="mt-dialog__title">{{ header() }}</h2>
            @if (closable()) {
              <button type="button" class="mt-dialog__close" aria-label="Close" (click)="close()">
                ×
              </button>
            }
          </div>
        }
        <div class="mt-dialog__body">
          <ng-content />
        </div>
        <div class="mt-dialog__footer">
          <ng-content select="[mtDialogFooter]" />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .mt-dialog-root {
        position: fixed;
        inset: 0;
        z-index: 11000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .mt-dialog-root--open {
        display: flex;
      }
      .mt-dialog-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
      }
      .mt-dialog {
        position: relative;
        z-index: 1;
        width: min(var(--mt-dialog-width, 32rem), 95vw);
        max-height: min(90vh, 40rem);
        overflow: hidden;
        background: var(--mt-surface-card, #fff);
        color: var(--mt-text, #212121);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
      }
      .mt-dialog__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--mt-surface-border, #e5e7eb);
        flex-shrink: 0;
      }
      .mt-dialog__title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 650;
      }
      .mt-dialog__close {
        border: 0;
        background: transparent;
        font-size: 1.35rem;
        line-height: 1;
        cursor: pointer;
        color: var(--mt-text-muted, #6c757d);
        padding: 0.15rem 0.35rem;
      }
      .mt-dialog__body {
        padding: 1rem;
        overflow: auto;
        flex: 1 1 auto;
        min-height: 0;
      }
      .mt-dialog__footer:not(:has(*)) {
        display: none;
      }
      .mt-dialog__footer:has(*) {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--mt-surface-border, #e5e7eb);
        flex-shrink: 0;
        background: var(--mt-surface-card, #fff);
      }
      .mt-dialog__footer > [mtDialogFooter],
      .mt-dialog__footer > .dialog-footer,
      .mt-dialog__footer > .dlg-actions,
      .mt-dialog__footer > .form-actions,
      .mt-dialog__footer > .composition-save-footer {
        display: flex;
        width: 100%;
        justify-content: flex-end;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtDialogComponent {
  readonly visible = model(false);
  readonly header = input<string | undefined>(undefined);
  readonly closable = input(true);
  readonly dismissableMask = input(true);
  /** CSS length for dialog width (e.g. `36rem`). */
  readonly width = input<string | undefined>(undefined);

  close(): void {
    this.visible.set(false);
  }

  onBackdrop(): void {
    if (this.dismissableMask()) {
      this.close();
    }
  }
}
