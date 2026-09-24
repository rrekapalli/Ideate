import { inject, provideAppInitializer } from '@angular/core';
import { AppUpdateService } from './app-update.service';

function bootstrapAppUpdate(): void {
  inject(AppUpdateService).start();
}

export function provideAppUpdateBootstrap() {
  return provideAppInitializer(bootstrapAppUpdate);
}
