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
          @if (shell.workspaceMeta()) {
            <span class="ws-meta">{{ shell.workspaceMeta() }}</span>
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
    .ws-meta { color: var(--mt-text-muted); font-size: var(--mt-fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
    const name = this.shell.workspaceName();
    return [
      {
        label: 'Home',
        active: !name,
        command: () => {
          this.shell.showHomeDashboard();
          void this.router.navigate(['/']);
        },
      },
      ...(name ? [{ label: name, active: true }] : []),
    ];
  }

  submitSearch(): void {
    this.shell.searchSubmit.next(this.shell.searchQuery());
  }
}
