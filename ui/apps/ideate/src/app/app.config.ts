import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideIdeateUi } from '@ideate/ui';
import { provideIdeateApiClient } from '@ideate/api-client';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { ThemeService } from './core/theme/theme.service';
import { provideAppUpdateBootstrap } from './core/pwa/app-update.bootstrap';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideIdeateUi({ darkModeSelector: '.app-dark', defaultAccent: 'emerald' }),
    provideIdeateApiClient({ baseUrl: environment.apiBase }),
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    provideAppUpdateBootstrap(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production && !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
