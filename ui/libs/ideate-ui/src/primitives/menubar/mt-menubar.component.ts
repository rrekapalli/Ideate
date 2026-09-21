import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MtIconComponent } from '../../icons/mt-icon.component';

export interface MtMenubarItem {
  label: string;
  command?: () => void;
  routerLink?: string;
  shortcut?: string;
  shortcutKey?: string;
  active?: boolean;
}

export interface MtMenuItem {
  label?: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
  command?: () => void;
  routerLink?: string | string[];
  shortcut?: string;
}

@Component({
  selector: 'mt-menubar',
  standalone: true,
  template: `
    <nav class="mt-menubar" role="menubar" [attr.aria-label]="ariaLabel()">
      @for (item of items(); track item.label) {
        <button
          type="button"
          class="mt-menubar__item"
          role="menuitem"
          [class.mt-menubar__item--active]="item.active"
          (click)="onItemClick(item)"
        >
          <span class="mt-menubar__label">{{ item.label }}</span>
        </button>
      }
    </nav>
  `,
  styles: [
    `
      .mt-menubar {
        display: flex;
        align-items: stretch;
        gap: 0.1rem;
        height: 100%;
        min-height: 0;
        background: transparent;
      }
      .mt-menubar__item {
        font: inherit;
        font-size: var(--mt-fs, 0.8125rem);
        border: 0;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: var(--mt-text, #212121);
        padding: 0 0.45rem;
        cursor: pointer;
        border-radius: 0;
        white-space: nowrap;
        height: 100%;
        box-sizing: border-box;
      }
      .mt-menubar__item:hover {
        color: var(--mt-primary, #10b981);
        background: transparent;
      }
      .mt-menubar__item--active {
        color: var(--mt-primary, #10b981);
        font-weight: 650;
        background: transparent;
        border-bottom-color: var(--mt-primary, #10b981);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtMenubarComponent {
  readonly items = input<MtMenubarItem[]>([]);
  readonly ariaLabel = input('Main');

  onItemClick(item: MtMenubarItem): void {
    item.command?.();
  }
}

@Component({
  selector: 'mt-menu',
  standalone: true,
  imports: [MtIconComponent],
  template: `
    <div class="mt-menu-host" #host>
      <ng-content />
      @if (open()) {
        <ul class="mt-menu" role="menu">
          @for (item of model(); track trackItem($index, item)) {
            @if (item.separator) {
              <li class="mt-menu__sep" role="separator"></li>
            } @else {
              <li role="none">
                <button
                  type="button"
                  class="mt-menu__item"
                  role="menuitem"
                  [disabled]="item.disabled"
                  (click)="run(item)"
                >
                  @if (item.icon) {
                    <mt-icon [name]="item.icon" [size]="14" />
                  }
                  <span>{{ item.label }}</span>
                </button>
              </li>
            }
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .mt-menu-host {
        position: relative;
        display: inline-flex;
      }
      .mt-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        z-index: 10050;
        min-width: 10rem;
        margin: 0;
        padding: 0.25rem 0;
        list-style: none;
        background: var(--mt-surface-card, #fff);
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
      }
      .mt-menu__item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.45rem;
        border: 0;
        background: transparent;
        font: inherit;
        font-size: 0.875rem;
        padding: 0.4rem 0.7rem;
        cursor: pointer;
        color: var(--mt-text, #212121);
        text-align: left;
      }
      .mt-menu__item:hover:not(:disabled) {
        background: color-mix(in srgb, var(--mt-primary, #10b981) 12%, transparent);
      }
      .mt-menu__sep {
        height: 1px;
        margin: 0.25rem 0;
        background: var(--mt-surface-border, #e5e7eb);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtMenuComponent {
  readonly model = input<MtMenuItem[]>([]);
  readonly open = signal(false);
  private readonly host = viewChild<ElementRef<HTMLElement>>('host');

  toggle(event?: Event): void {
    event?.stopPropagation();
    this.open.update((v) => !v);
  }

  hide(): void {
    this.open.set(false);
  }

  run(item: MtMenuItem): void {
    if (item.disabled) {
      return;
    }
    item.command?.();
    this.hide();
  }

  trackItem(index: number, item: MtMenuItem): string {
    return item.separator ? `sep-${index}` : `${item.label}-${index}`;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const root = this.host()?.nativeElement;
    if (root && !root.contains(ev.target as Node)) {
      this.hide();
    }
  }
}
