import { Component } from '@angular/core';
import { MtConfirmHostComponent, MtToastHostComponent } from '@ideate/ui';
import { AppShellComponent } from './core/shell/app-shell.component';
import { AppUpdateBannerComponent } from './core/pwa/app-update-banner.component';

@Component({
  selector: 'ideate-root',
  imports: [AppShellComponent, AppUpdateBannerComponent, MtToastHostComponent, MtConfirmHostComponent],
  template: `<ideate-app-shell /><app-update-banner /><mt-toast-host /><mt-confirm-host />`,
  styles: `:host { display: flex; flex-direction: column; height: 100%; }`,
})
export class AppComponent {}
