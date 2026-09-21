import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  model,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MtAccordionItemComponent } from './mt-accordion-item.component';

@Component({
  selector: 'mt-accordion',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="mt-acc">
      @for (item of readyItems(); track item.value()) {
        <div class="mt-acc__item" [class.mt-acc__item--open]="isOpen(item.value()!)">
          <button
            type="button"
            class="mt-acc__header"
            [disabled]="item.disabled()"
            [attr.aria-expanded]="isOpen(item.value()!)"
            (click)="toggle(item.value()!)"
          >
            <span>{{ item.header() }}</span>
            <span aria-hidden="true">{{ isOpen(item.value()!) ? '▾' : '▸' }}</span>
          </button>
          @if (isOpen(item.value()!)) {
            <div class="mt-acc__body">
              <ng-container *ngTemplateOutlet="item.contentTpl" />
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .mt-acc {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .mt-acc__item {
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        background: var(--mt-surface-card, #fff);
      }
      .mt-acc__header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.55rem;
        border: 0;
        background: transparent;
        font: inherit;
        font-size: calc(0.875rem / var(--font-size, 1rem));
        font-weight: 600;
        cursor: pointer;
        color: var(--mt-text, #212121);
      }
      .mt-acc__item--open {
        border-color: color-mix(in srgb, var(--mt-primary, #10b981) 40%, var(--mt-surface-border));
      }
      .mt-acc__body {
        padding: 0.35rem 0.55rem 0.55rem;
        border-top: 1px solid var(--mt-surface-border, #e5e7eb);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtAccordionComponent {
  readonly multiple = input(false);
  readonly value = model<string | string[] | null>(null);

  readonly items = contentChildren(MtAccordionItemComponent);
  readonly readyItems = computed(() => this.items().filter((item) => !!item.value()));

  isOpen(v: string): boolean {
    const cur = this.value();
    if (Array.isArray(cur)) {
      return cur.includes(v);
    }
    return cur === v;
  }

  toggle(v: string): void {
    if (this.multiple()) {
      const cur = Array.isArray(this.value()) ? [...(this.value() as string[])] : [];
      const idx = cur.indexOf(v);
      if (idx >= 0) {
        cur.splice(idx, 1);
      } else {
        cur.push(v);
      }
      this.value.set(cur);
    } else {
      const next = this.value() === v ? null : v;
      this.value.set(next);
    }
  }
}
