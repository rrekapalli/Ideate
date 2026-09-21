import type { MtAccentId } from '../tokens/accent-ramps';
import type { MtThemeFamily } from './presets';

export type MtColorMode = 'light' | 'dark' | 'system';

export type MtFontFamily = 'inter' | 'system';

export interface MtAppearancePreference {
  colorMode: MtColorMode;
  accentPalette: MtAccentId;
  fontSize: number;
  /** Global UI font family (sets --font-family). */
  fontFamily?: MtFontFamily;
  /** Aura-inspired surface/radius preset. */
  themeFamily?: MtThemeFamily;
  /** Frosted glass on shell chrome (header, drawers, dialogs). */
  glassEffect?: boolean;
}

export interface MtUiConfig {
  darkModeSelector?: string;
  defaultAccent?: MtAccentId;
}
