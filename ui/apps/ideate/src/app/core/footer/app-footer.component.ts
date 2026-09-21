import { Component, inject } from '@angular/core';
import { ShellContextService } from '../shell/shell-context.service';

@Component({
  selector: 'ideate-app-footer',
  template: `
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-left">
          <div class="footer-strip-item">
            <span class="strip-label">Workspace:</span>
            <span class="strip-value">{{ shell.workspaceName() || 'Home' }}</span>
          </div>
          @if (shell.credits() !== null) {
            <div class="footer-separator"></div>
            <div class="footer-strip-item">
              <span class="strip-label">Credits:</span>
              <span class="strip-value">{{ shell.credits() }}</span>
            </div>
            <div class="footer-separator"></div>
            <div class="footer-strip-item">
              <span class="strip-label">Usage:</span>
              <span class="strip-value">{{ shell.usageMinor() }} minor INR</span>
            </div>
          }
        </div>
        <div class="footer-right">
          <p class="copy">© {{ year }} Ideate</p>
        </div>
      </div>
    </footer>
  `,
  styles: `
    :host { display: block; flex-shrink: 0; z-index: 1000; }
    .app-footer {
      height: var(--mt-shell-footer-height, 3rem);
      padding: 0 0.65rem;
      border-top: 1px solid var(--surface-border);
      background-color: var(--mt-surface-card, var(--surface-card));
      display: flex; align-items: center; box-sizing: border-box;
    }
    html[data-mt-glass='on'] .app-footer {
      background: var(--mt-glass-bg);
      backdrop-filter: blur(var(--mt-glass-blur));
    }
    .footer-content {
      display: flex; justify-content: space-between; align-items: center;
      width: 100%; font-size: var(--mt-fs-sm); gap: 0.5rem;
    }
    .footer-left, .footer-right { display: flex; align-items: center; gap: 0.5rem; }
    .footer-separator { width: 1px; height: 0.85rem; background: var(--text-color-secondary); opacity: 0.3; }
    .footer-strip-item { display: flex; align-items: baseline; gap: 0.35rem; white-space: nowrap; }
    .strip-label { font-weight: 500; color: var(--text-color-secondary); }
    .strip-value { font-weight: 600; }
    .copy { margin: 0; color: var(--text-color-secondary); }
  `,
})
export class AppFooterComponent {
  readonly shell = inject(ShellContextService);
  readonly year = new Date().getFullYear();
}
