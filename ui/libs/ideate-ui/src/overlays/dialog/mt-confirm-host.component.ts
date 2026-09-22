import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MtButtonComponent } from '../../primitives/button/mt-button.component';
import { MtIconComponent } from '../../icons/mt-icon.component';
import { MtDialogComponent } from './mt-dialog.component';
import { MtConfirm, MtConfirmRequest } from '../toast/mt-toast.service';

@Component({
  selector: 'mt-confirm-host',
  standalone: true,
  imports: [MtDialogComponent, MtButtonComponent, MtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mt-dialog
      [visible]="open()"
      (visibleChange)="onVisible($event)"
      [header]="request()?.header"
      [closable]="true"
      [dismissableMask]="true"
      width="22rem"
    >
      <div class="confirm">
        <span class="confirm-icon" [class.confirm-icon--danger]="request()?.danger" aria-hidden="true">
          <mt-icon [name]="request()?.danger ? 'warning' : 'info'" [size]="20" />
        </span>
        <p class="confirm-msg">{{ request()?.message }}</p>
      </div>
      <div class="dlg-actions" mtDialogFooter>
        <mt-button
          variant="text"
          [label]="request()?.rejectLabel ?? 'Cancel'"
          (clicked)="finish(false)"
        />
        <button
          type="button"
          class="accept"
          [class.accept--danger]="request()?.danger"
          (click)="finish(true)"
        >
          {{ request()?.acceptLabel ?? 'OK' }}
        </button>
      </div>
    </mt-dialog>
  `,
  styles: `
    .confirm {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .confirm-icon {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 99px;
      color: var(--mt-severity-info, #2563eb);
      background: color-mix(in srgb, var(--mt-severity-info, #2563eb) 14%, transparent);
    }
    .confirm-icon--danger {
      color: var(--mt-severity-danger, #dc2626);
      background: color-mix(in srgb, var(--mt-severity-danger, #dc2626) 14%, transparent);
    }
    .confirm-msg {
      margin: 0.15rem 0 0;
      font-size: 0.88rem;
      line-height: 1.45;
      color: var(--mt-text, #212121);
    }
    .dlg-actions { display: flex; justify-content: flex-end; gap: 0.45rem; width: 100%; }
    .accept {
      font: inherit;
      font-size: var(--mt-fs, 0.8125rem);
      min-height: var(--mt-control-height, 1.75rem);
      padding: var(--mt-button-padding, 0.2rem 0.7rem);
      border: 0;
      border-radius: var(--mt-corner-radius, 1px);
      cursor: pointer;
      background: var(--mt-primary, #10b981);
      color: var(--mt-on-primary, #fff);
    }
    .accept:hover { background: var(--mt-primary-hover, #059669); }
    .accept--danger {
      background: var(--mt-severity-danger, #dc2626);
      color: #fff;
    }
    .accept--danger:hover { filter: brightness(0.92); }
  `,
})
export class MtConfirmHostComponent implements OnInit {
  private readonly confirm = inject(MtConfirm);
  private readonly destroyRef = inject(DestroyRef);
  readonly request = signal<MtConfirmRequest | null>(null);
  readonly open = signal(false);
  private closing = false;

  ngOnInit(): void {
    this.confirm.request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((req) => {
      this.closing = false;
      this.request.set(req);
      this.open.set(!!req);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) {
      this.finish(false);
    }
  }

  onVisible(visible: boolean): void {
    if (!visible) {
      this.finish(false);
    }
  }

  finish(ok: boolean): void {
    if (this.closing || !this.request()) {
      return;
    }
    this.closing = true;
    this.open.set(false);
    this.request.set(null);
    this.confirm.settle(ok);
  }
}
