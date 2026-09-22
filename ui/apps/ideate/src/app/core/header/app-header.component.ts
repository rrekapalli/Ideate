import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MtButtonComponent, MtMenubarComponent, type MtMenubarItem } from '@ideate/ui';
import { HeaderThemeMenuComponent } from './header-theme-menu.component';
import { ShellContextService } from '../shell/shell-context.service';

@Component({
  selector: 'ideate-app-header',
  imports: [FormsModule, RouterLink, MtButtonComponent, MtMenubarComponent, HeaderThemeMenuComponent],
  template: `
    <header class="app-header">
      <div class="header-container">
        <div class="header-left">
          <a class="app-title" routerLink="/">Ideate</a>
          <mt-menubar [items]="menuItems" ariaLabel="Main navigation" />
          @if (shell.workspaceName(); as wsName) {
            <span class="ws-chip" [title]="shell.workspaceMeta() || wsName">
              <span class="ws-chip-name">{{ wsName }}</span>
              <button type="button" class="ws-chip-close" aria-label="Close workspace" (click)="closeWorkspace($event)">×</button>
            </span>
          }
        </div>
        <div class="header-right">
          @if (shell.searchEnabled()) {
            <input
              class="search"
              [ngModel]="shell.searchQuery()"
              (ngModelChange)="shell.searchQuery.set($event)"
              placeholder="Search objects and documents"
              (keydown.enter)="submitSearch()"
            />
            <mt-button size="sm" variant="outlined" icon="search" [label]="'Search'" (clicked)="submitSearch()" />
          }
          <ideate-header-theme-menu />
        </div>
      </div>
    </header>
  `,
  styles: `
    :host { display: block; flex-shrink: 0; z-index: 1100; }
    .app-header {
      height: var(--mt-shell-header-height, 3rem);
      border-bottom: 1px solid var(--mt-surface-border, var(--surface-border));
      box-sizing: border-box;
    }
    html[data-mt-glass='on'] .app-header {
      background: var(--mt-glass-bg);
      backdrop-filter: blur(var(--mt-glass-blur));
    }
    .header-container {
      display: flex; justify-content: space-between; align-items: center;
      width: 100%; height: 100%; box-sizing: border-box;
      padding: 0 0.65rem; padding-inline-end: 4px;
      background-color: var(--mt-surface-card, #fff);
    }
    html[data-mt-glass='on'] .header-container { background: transparent; }
    .header-left { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
    .app-title {
      font-size: var(--mt-fs-lg); font-weight: 700; letter-spacing: -0.02em;
      color: var(--primary-color); text-decoration: none;
    }
    .ws-chip {
      display: inline-flex; align-items: center; gap: 0.35rem; min-width: 0; max-width: 16rem;
      padding: 0.12rem 0.2rem 0.12rem 0.55rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--mt-primary, #10b981) 30%, var(--mt-surface-border, var(--surface-border)));
      background: color-mix(in srgb, var(--mt-primary, #10b981) 12%, var(--mt-surface-card, #fff));
      color: var(--mt-text, var(--text-color));
      font-size: var(--mt-fs-sm); font-weight: 600;
    }
    .ws-chip-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ws-chip-close {
      flex: none; width: 1.25rem; height: 1.25rem; border: 0; border-radius: 999px;
      background: transparent; color: var(--mt-text-muted, var(--text-color-secondary));
      cursor: pointer; font-size: 1rem; line-height: 1; padding: 0;
    }
    .ws-chip-close:hover { background: var(--surface-hover, #eee); color: var(--mt-text, var(--text-color)); }
    .header-right { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .search {
      width: 14rem; background: var(--mt-input-bg); border: 1px solid var(--mt-surface-border);
      color: inherit; padding: var(--mt-input-padding); font-size: var(--mt-fs);
      border-radius: var(--mt-panel-border-radius, 1px); min-height: var(--mt-control-height);
      box-sizing: border-box;
    }
  `,
})
export class AppHeaderComponent {
  readonly shell = inject(ShellContextService);
  private readonly router = inject(Router);

  get menuItems(): MtMenubarItem[] {
    return [
      {
        label: 'Home',
        active: !this.shell.workspaceName(),
        command: () => this.goHome(),
      },
    ];
  }

  closeWorkspace(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.goHome();
  }

  private goHome(): void {
    this.shell.showHomeDashboard();
    void this.router.navigate(['/']);
  }

  submitSearch(): void {
    this.shell.searchSubmit.next(this.shell.searchQuery());
  }
}
