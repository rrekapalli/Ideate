import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  input,
  model,
} from '@angular/core';
import { MtTabComponent } from './mt-tab.component';

/**
 * Lightweight tabs. Only the active panel's template is mounted.
 * Do not wrap panel bodies in `*ngIf="activeTab === …"` — that desyncs from `value`
 * and leaves an empty panel. Lazy loading is already handled here.
 */
@Component({
  selector: 'mt-tabs',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="mt-tabs" role="tablist">
      @for (tab of readyTabs(); track tab.value) {
        <button
          type="button"
          class="mt-tabs__tab"
          role="tab"
          [attr.id]="'mt-tab-' + tab.value"
          [attr.aria-selected]="value() === tab.value"
          [attr.aria-controls]="'mt-tabpanel-' + tab.value"
          [class.mt-tabs__tab--active]="value() === tab.value"
          [disabled]="tab.disabled"
          (click)="select(tab.value)"
        >
          <span class="tab-shortcut-text tab-shortcut-text--managed">{{ tab.label }}</span>
        </button>
      }
    </div>
    <div class="mt-tabs__panels">
      @for (tab of readyTabs(); track tab.value) {
        @if (value() === tab.value) {
          <div
            class="mt-tabs__panel"
            role="tabpanel"
            [attr.id]="'mt-tabpanel-' + tab.value"
            [attr.aria-labelledby]="'mt-tab-' + tab.value"
          >
            <ng-container *ngTemplateOutlet="tab.ref.contentTpl" />
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        min-height: 0;
        flex: 1 1 auto;
        align-self: stretch;
      }
      :host > mt-tab {
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        pointer-events: none;
      }
      .mt-tabs {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        gap: 0;
        flex-wrap: wrap;
        flex-shrink: 0;
        min-height: 2.15rem;
        box-sizing: border-box;
        padding: 0 0.5rem;
        background: var(--mt-surface-card, var(--surface-card, #fff));
        border-bottom: 1px solid var(--mt-surface-border, var(--surface-border, #e5e7eb));
      }
      .mt-tabs__tab {
        font: inherit;
        font-size: calc(0.8125rem / var(--font-size, 1rem));
        font-weight: 500;
        padding: var(--mt-tab-padding, 0.35rem 0.7rem);
        margin: 0;
        border: none;
        border-bottom: 3px solid transparent;
        border-radius: 0;
        background: transparent;
        color: var(--mt-text-muted, var(--text-color-secondary, #6c757d));
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        transition: color 0.12s ease, border-color 0.12s ease;
        position: relative;
        box-shadow: none;
      }
      .mt-tabs__tab:hover:not(:disabled) {
        color: var(--mt-text, var(--text-color, #212121));
        background: transparent;
      }
      .mt-tabs__tab--active {
        color: var(--mt-primary, var(--primary-color, #10b981));
        background: transparent;
        font-weight: 650;
        border-bottom-color: var(--mt-primary, var(--primary-color, #10b981));
        box-shadow: none;
      }
      .mt-tabs__tab:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .mt-tabs__panels {
        flex: 1 1 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: auto;
        background: var(--mt-surface-card, var(--surface-card, #fff));
      }
      .mt-tabs__panel {
        flex: 1 1 0;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        padding-top: 0;
        box-sizing: border-box;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtTabsComponent {
  readonly value = model<string | number>(0);
  readonly selectOnFocus = input(true);

  readonly tabs = contentChildren(MtTabComponent);
  readonly readyTabs = computed(() =>
    this.tabs()
      .filter((t) => t.value() !== undefined && t.value() !== null)
      .map((t) => ({
        ref: t,
        value: t.value() as string | number,
        label: t.label(),
        disabled: t.disabled(),
      }))
  );

  constructor() {
    effect(() => {
      const list = this.readyTabs();
      if (!list.length) {
        return;
      }
      const current = this.value();
      if (!list.some((t) => t.value === current)) {
        this.value.set(list[0].value);
      }
    });
  }

  select(v: string | number): void {
    this.value.set(v);
  }
}
