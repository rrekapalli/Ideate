import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from '../header/app-header.component';
import { AppFooterComponent } from '../footer/app-footer.component';
import { AppLeftNavComponent } from '../nav/app-left-nav.component';
import { ShellContextService } from './shell-context.service';

@Component({
  selector: 'ideate-app-shell',
  imports: [RouterOutlet, AppHeaderComponent, AppFooterComponent, AppLeftNavComponent],
  template: `
    <div class="app-shell-single">
      <ideate-app-header />
      <div
        class="content-container"
        [class.is-resizing]="shell.resizing()"
        [style.--ideate-left-drawer.px]="shell.leftDrawerWidth()"
        [style.--ideate-right-drawer.px]="shell.rightDrawerWidth()"
      >
        @if (shell.showLeftNav()) {
          <ideate-app-left-nav />
        }
        <main
          class="main-content"
          id="main-content"
          [class.home-full]="!shell.showLeftNav()"
          [class.workspaces-drawer-open]="shell.workspacesDrawerOpen()"
        >
          <div class="content-area-wrapper">
            <router-outlet />
          </div>
        </main>
      </div>
      <ideate-app-footer />
    </div>
  `,
  styles: `
    :host {
      display: flex; flex-direction: column; flex: 1 1 auto;
      min-height: 0; height: 100%; width: 100%;
    }
    .app-shell-single {
      display: flex; flex-direction: column; flex: 1 1 auto;
      min-height: 0; height: 100%; overflow: hidden; width: 100%;
    }
    .content-container {
      position: relative;
      display: flex; flex-direction: column; flex: 1 1 0;
      min-height: 0; height: 0; overflow: hidden;
      background-color: var(--surface-ground);
    }
    .main-content {
      flex: 1 1 0; min-height: 0; height: 0; overflow: hidden;
      display: flex; flex-direction: column; position: relative;
      margin-left: 48px;
      transition: margin-left 0.2s ease;
    }
    .main-content.home-full {
      margin-left: 0;
    }
    .main-content.workspaces-drawer-open {
      margin-left: calc(48px + var(--ideate-left-drawer, 280px));
    }
    .content-container.is-resizing .main-content {
      transition: none;
    }
    .content-area-wrapper {
      flex: 1 1 0; min-height: 0; height: 0; min-width: 0;
      display: flex; flex-direction: column; overflow: hidden; width: 100%;
      box-sizing: border-box;
    }
  `,
})
export class AppShellComponent {
  readonly shell = inject(ShellContextService);
}
