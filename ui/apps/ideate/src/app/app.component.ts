import { Component } from '@angular/core';
import { MtToastHostComponent } from '@ideate/ui';
import { AppShellComponent } from './core/shell/app-shell.component';

@Component({
  selector: 'ideate-root',
  imports: [AppShellComponent, MtToastHostComponent],
  template: `<ideate-app-shell /><mt-toast-host />`,
  styles: `:host { display: flex; flex-direction: column; height: 100%; }`,
})
export class AppComponent {}
