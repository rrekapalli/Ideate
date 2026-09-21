import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { MtUiConfig } from './appearance.types';
import { defaultAccent } from './apply-appearance';

export const MONEYTREE_UI_CONFIG = new InjectionToken<MtUiConfig>('MONEYTREE_UI_CONFIG');

export function provideMoneytreeUi(config: MtUiConfig = {}): EnvironmentProviders {
  const resolved: MtUiConfig = {
    darkModeSelector: config.darkModeSelector ?? '.app-dark',
    defaultAccent: defaultAccent(config.defaultAccent),
  };
  return makeEnvironmentProviders([{ provide: MONEYTREE_UI_CONFIG, useValue: resolved }]);
}

/** Ideate alias for the copied MoneyTree UI provider. */
export const IDEATE_UI_CONFIG = MONEYTREE_UI_CONFIG;
export function provideIdeateUi(config: MtUiConfig = {}): EnvironmentProviders {
  return provideMoneytreeUi(config);
}
