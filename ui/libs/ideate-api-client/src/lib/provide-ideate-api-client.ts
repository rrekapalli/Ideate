import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { ApiConfig } from './api-config';

export const IDEATE_API_CONFIG = new InjectionToken<ApiConfig>('IDEATE_API_CONFIG');

export function provideIdeateApiClient(config: ApiConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: IDEATE_API_CONFIG, useValue: config }]);
}
