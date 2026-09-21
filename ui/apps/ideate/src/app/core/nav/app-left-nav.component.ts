import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MtIconComponent } from '@ideate/ui';
import { ShellContextService } from '../shell/shell-context.service';

@Component({
  selector: 'ideate-app-left-nav',
  imports: [MtIconComponent],
  template: `
    <nav class="nav-bar left-nav-bar" role="navigation" aria-label="Workspace">
      <ul class="nav-menu">
        <li>
          <button type="button" class="nav-icon-btn" [class.active]="shell.leftDrawer() === 'objects'" title="Objects" (click)="shell.toggleLeft('objects')">
            <mt-icon name="sitemap" [size]="14" />
            <span class="btn-label">Objects</span>
          </button>
        </li>
        <li>
          <button type="button" class="nav-icon-btn" [class.active]="shell.leftDrawer() === 'documents'" title="Documents" (click)="shell.toggleLeft('documents')">
            <mt-icon name="description" [size]="14" />
            <span class="btn-label">Docs</span>
          </button>
        </li>
        <li>
          <button type="button" class="nav-icon-btn" [class.active]="shell.leftDrawer() === 'branches'" title="Branches" (click)="shell.toggleLeft('branches')">
            <mt-icon name="share" [size]="14" />
            <span class="btn-label">Branch</span>
          </button>
        </li>
      </ul>
      <ul class="nav-menu nav-menu--end">
        <li>
          <button type="button" class="nav-icon-btn" title="New thought" (click)="shell.newThoughtClick.next()">
            <mt-icon name="add" [size]="14" />
            <span class="btn-label">New</span>
          </button>
        </li>
        <li>
          <button type="button" class="nav-icon-btn" title="Settings" (click)="shell.settingsClick.next()">
            <mt-icon name="settings" [size]="14" />
            <span class="btn-label">Setup</span>
          </button>
        </li>
      </ul>
    </nav>
  `,
  styles: `
    :host { display: contents; }
  `,
})
export class AppLeftNavComponent {
  readonly shell = inject(ShellContextService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      const home = e.urlAfterRedirects === '/' || e.urlAfterRedirects === '';
      if (home) this.shell.showHomeDashboard();
    });
  }
}
