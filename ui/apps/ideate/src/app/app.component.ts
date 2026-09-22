import { Component } from '@angular/core';
import { MtConfirmHostComponent, MtToastHostComponent } from '@ideate/ui';
import { AppShellComponent } from './core/shell/app-shell.component';

@Component({
  selector: 'ideate-root',
  imports: [AppShellComponent, MtToastHostComponent, MtConfirmHostComponent],
  template: `<ideate-app-shell /><mt-toast-host /><mt-confirm-host />`,
  styles: `:host { display: flex; flex-direction: column; height: 100%; }`,
})
export class AppComponent {}
