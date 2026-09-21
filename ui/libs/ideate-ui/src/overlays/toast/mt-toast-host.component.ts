import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MtIconComponent } from '../../icons/mt-icon.component';
import { MtToast, MtToastMessage } from './mt-toast.service';

@Component({
  selector: 'mt-toast-host',
  standalone: true,
  imports: [MtIconComponent],
  template: `
    <div class="mt-toast-host" aria-live="polite" aria-relevant="additions">
      @for (m of messages(); track m.id) {
        <div class="mt-toast" [attr.data-severity]="m.severity" role="status">
          <div class="mt-toast__body">
            @if (m.summary) {
              <div class="mt-toast__summary">{{ m.summary }}</div>
            }
            @if (m.detail) {
              <div class="mt-toast__detail">{{ m.detail }}</div>
            }
          </div>
          <button type="button" class="mt-toast__close" aria-label="Dismiss" (click)="dismiss(m.id)">
            <mt-icon name="close" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .mt-toast-host {
        position: fixed;
        bottom: 0.75rem;
        right: 0.75rem;
        top: auto;
        z-index: 12000;
        display: flex;
        flex-direction: column-reverse;
        gap: 0.4rem;
        max-width: min(22rem, calc(100vw - 1.5rem));
        pointer-events: none;
      }
      @media (max-width: 640px) {
        .mt-toast-host {
          left: 50%;
          right: auto;
          top: 0.75rem;
          bottom: auto;
          transform: translateX(-50%);
          flex-direction: column;
          align-items: stretch;
        }
      }
      .mt-toast {
        pointer-events: auto;
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        padding: 0.5rem 0.65rem;
        border-radius: var(--mt-corner-radius, 1px);
        background: var(--mt-surface-card, #fff);
        color: var(--mt-text, #212121);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-left: 3px solid var(--mt-primary, #10b981);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
      }
      .mt-toast[data-severity='success'] {
        border-left-color: var(--mt-severity-success);
      }
      .mt-toast[data-severity='warn'] {
        border-left-color: var(--mt-palette-warn);
      }
      .mt-toast[data-severity='error'] {
        border-left-color: var(--mt-palette-danger);
      }
      .mt-toast[data-severity='info'] {
        border-left-color: var(--mt-palette-info);
      }
      .mt-toast__summary {
        font-weight: 600;
        font-size: 0.875rem;
      }
      .mt-toast__detail {
        font-size: 0.8rem;
        color: var(--mt-text-muted);
      }
      .mt-toast__close {
        border: 0;
        background: transparent;
        cursor: pointer;
        color: var(--mt-text-muted);
        padding: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtToastHostComponent implements OnInit {
  private readonly toast = inject(MtToast);
  private readonly destroyRef = inject(DestroyRef);
  readonly messages = signal<MtToastMessage[]>([]);
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  ngOnInit(): void {
    this.toast.messages$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((m) => {
      this.messages.update((list) => [...list, m]);
      const life = m.life ?? 4000;
      if (life > 0) {
        const t = setTimeout(() => this.dismiss(m.id), life);
        this.timers.set(m.id, t);
      }
    });
    this.toast.clear$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.timers.forEach(clearTimeout);
      this.timers.clear();
      this.messages.set([]);
    });
  }

  dismiss(id: number): void {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
    this.messages.update((list) => list.filter((m) => m.id !== id));
  }
}
