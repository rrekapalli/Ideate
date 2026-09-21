import { MT_ACCENT_RAMPS, type MtAccentId } from '../tokens/accent-ramps';
import type { MtAppearancePreference, MtColorMode, MtFontFamily } from './appearance.types';
import {
  MT_THEME_FAMILY_PRESETS,
  normalizeMtThemeFamily,
  type MtThemeFamily,
} from './presets';

const DARK_CLASS = 'app-dark';

const MT_FONT_FAMILY_STACKS: Record<MtFontFamily, string> = {
  inter:
    'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  system:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

function normalizeMtFontFamily(raw: unknown): MtFontFamily {
  return raw === 'inter' ? 'inter' : 'system';
}

export function resolveEffectiveDark(
  colorMode: MtColorMode,
  win: Window | null = typeof window !== 'undefined' ? window : null
): boolean {
  if (colorMode === 'dark') return true;
  if (colorMode === 'light') return false;
  if (!win?.matchMedia) return false;
  return win.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Batch-write --mt-* CSS variables and document theme attributes. */
export function applyMoneytreeAppearance(
  doc: Document,
  pref: MtAppearancePreference,
  options?: { darkModeSelector?: string }
): { effectiveDark: boolean; themeFamily: MtThemeFamily; glassEffect: boolean; fontFamily: MtFontFamily } {
  const html = doc.documentElement;
  const darkClass = (options?.darkModeSelector ?? `.${DARK_CLASS}`).replace(/^\./, '');
  const effectiveDark = resolveEffectiveDark(pref.colorMode, doc.defaultView);
  const themeFamily = normalizeMtThemeFamily(pref.themeFamily);
  const glassEffect = pref.glassEffect === true;
  const fontFamily = normalizeMtFontFamily(pref.fontFamily);
  const preset = MT_THEME_FAMILY_PRESETS[themeFamily];
  const surfaces = effectiveDark ? preset.dark : preset.light;

  html.classList.toggle(darkClass, effectiveDark);
  html.setAttribute('data-mt-theme', themeFamily);
  html.setAttribute('data-mt-accent', pref.accentPalette || 'emerald');
  html.setAttribute('data-mt-glass', glassEffect ? 'on' : 'off');
  html.setAttribute('data-mt-font', fontFamily);

  const rem = Math.min(2.5, Math.max(0.75, Number(pref.fontSize) || 1));
  const rounded = Math.round(rem * 100) / 100;
  html.style.setProperty('--app-font-size', `${rounded}rem`);
  html.style.setProperty('--font-size', String(rounded));
  html.style.setProperty('--font-family', MT_FONT_FAMILY_STACKS[fontFamily]);

  const ramp = MT_ACCENT_RAMPS[pref.accentPalette] ?? MT_ACCENT_RAMPS.emerald;
  const vars: Record<string, string> = {
    '--font-family': MT_FONT_FAMILY_STACKS[fontFamily],
    '--app-font-size': `${rounded}rem`,
    '--font-size': String(rounded),
    '--mt-primary': ramp[500],
    '--mt-primary-hover': ramp[600],
    '--mt-on-primary': '#ffffff',
    '--mt-primary-50': ramp[50],
    '--mt-primary-100': ramp[100],
    '--mt-primary-200': ramp[200],
    '--mt-primary-300': ramp[300],
    '--mt-primary-400': ramp[400],
    '--mt-primary-500': ramp[500],
    '--mt-primary-600': ramp[600],
    '--mt-primary-700': ramp[700],
    '--mt-primary-800': ramp[800],
    '--mt-primary-900': ramp[900],
    '--mt-primary-950': ramp[950],

    '--mt-surface-card': surfaces.card,
    '--mt-surface-ground': surfaces.ground,
    '--mt-surface-border': surfaces.border,
    '--mt-surface-hover': surfaces.hover,
    '--mt-surface-section': surfaces.section,
    '--mt-surface-overlay': surfaces.overlay,
    '--mt-text': surfaces.text,
    '--mt-text-muted': surfaces.textMuted,
    '--mt-input-bg': surfaces.inputBg,
    '--mt-panel-bg': glassEffect
      ? effectiveDark
        ? preset.glass.darkBg
        : preset.glass.lightBg
      : surfaces.card,
    '--mt-sidebar-bg': glassEffect
      ? effectiveDark
        ? preset.glass.darkBg
        : preset.glass.lightBg
      : surfaces.card,

    '--mt-panel-border-radius': preset.panelBorderRadius,
    '--mt-corner-radius': preset.panelBorderRadius,
    '--mt-dashboard-widget-radius': preset.panelBorderRadius,
    '--mt-tab-padding': preset.tabPadding,
    '--mt-shadow-sm': preset.shadowSm,
    '--mt-shadow-md': preset.shadowMd,
    '--card-shadow': preset.shadowMd,
    '--card-shadow-hover': preset.shadowSm,
    '--mt-metric-panel-shadow': preset.shadowSm,

    '--mt-chart-surface': surfaces.chartSurface,
    '--mt-chart-surface-muted': surfaces.chartSurfaceMuted,
    '--mt-chart-text': surfaces.text,
    '--mt-chart-text-muted': surfaces.textMuted,
    '--mt-chart-accent': ramp[500],
    '--mt-chart-accent-dark': ramp[600],
    '--mt-chart-border': surfaces.border,
    '--mt-ag-header-bg': surfaces.agHeaderBg,
    '--mt-form-label': surfaces.text,
    '--mt-form-muted': surfaces.textMuted,

    '--mt-glass-bg': effectiveDark ? preset.glass.darkBg : preset.glass.lightBg,
    '--mt-glass-blur': preset.glass.blur,
    '--mt-glass-border': effectiveDark ? preset.glass.borderDark : preset.glass.borderLight,
    '--mt-glass-highlight': effectiveDark
      ? 'color-mix(in srgb, #ffffff 10%, transparent)'
      : 'color-mix(in srgb, #ffffff 70%, transparent)',
    '--mt-glass-shadow': effectiveDark
      ? '0 8px 32px color-mix(in srgb, #000 45%, transparent)'
      : '0 8px 28px color-mix(in srgb, #152033 10%, transparent)',
    '--mt-glass-orb-primary': effectiveDark
      ? `color-mix(in srgb, ${ramp[500]} 28%, transparent)`
      : `color-mix(in srgb, ${ramp[400]} 46%, transparent)`,
    '--mt-glass-orb-secondary': effectiveDark
      ? 'color-mix(in srgb, #6366f1 22%, transparent)'
      : 'color-mix(in srgb, #a78bfa 40%, transparent)',
  };

  // Bridge unprefixed vars used by existing feature SCSS
  vars['--primary-color'] = vars['--mt-primary'];
  vars['--text-color'] = vars['--mt-text'];
  vars['--text-color-secondary'] = vars['--mt-text-muted'];
  vars['--surface-card'] = vars['--mt-surface-card'];
  vars['--surface-ground'] = vars['--mt-surface-ground'];
  vars['--surface-border'] = vars['--mt-surface-border'];
  vars['--surface-hover'] = vars['--mt-surface-hover'];
  vars['--card-background'] = vars['--mt-surface-card'];
  vars['--background-color'] = vars['--mt-surface-ground'];
  // Surface scale — many features use --surface-100 for selected/muted fills (must track mode)
  vars['--surface-0'] = surfaces.card;
  vars['--surface-50'] = surfaces.section;
  vars['--surface-100'] = surfaces.hover;
  vars['--surface-200'] = surfaces.border;
  vars['--input-background'] = surfaces.inputBg;

  for (const [k, v] of Object.entries(vars)) {
    html.style.setProperty(k, v);
  }

  html.dispatchEvent(
    new CustomEvent('mt-appearance-changed', {
      detail: {
        effectiveDark,
        themeFamily,
        glassEffect,
        fontFamily,
        accentPalette: pref.accentPalette,
      },
    })
  );

  return { effectiveDark, themeFamily, glassEffect, fontFamily };
}

export function defaultAccent(id?: MtAccentId): MtAccentId {
  return id ?? 'emerald';
}
