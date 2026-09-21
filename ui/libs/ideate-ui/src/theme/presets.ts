/** Compact data-terminal theme family presets (surfaces, 1px radius, density, glass). */

export type MtThemeFamily = 'aura' | 'lara' | 'nora';

export interface MtThemeSurfaces {
  card: string;
  ground: string;
  border: string;
  hover: string;
  text: string;
  textMuted: string;
  inputBg: string;
  section: string;
  overlay: string;
  chartSurface: string;
  chartSurfaceMuted: string;
  agHeaderBg: string;
}

export interface MtThemeFamilyPreset {
  id: MtThemeFamily;
  panelBorderRadius: string;
  tabPadding: string;
  shadowSm: string;
  shadowMd: string;
  light: MtThemeSurfaces;
  dark: MtThemeSurfaces;
  glass: {
    lightBg: string;
    darkBg: string;
    blur: string;
    borderLight: string;
    borderDark: string;
  };
}

/** Shared compact chrome — all families stay nearly square for data density. */
const COMPACT_RADIUS = '1px';
const COMPACT_TAB_PAD = '0.35rem 0.7rem';
const SHADOW_NONE = 'none';
const SHADOW_HAIR = '0 1px 0 color-mix(in srgb, #000 4%, transparent)';

export const MT_THEME_FAMILY_PRESETS: Record<MtThemeFamily, MtThemeFamilyPreset> = {
  aura: {
    id: 'aura',
    panelBorderRadius: COMPACT_RADIUS,
    tabPadding: COMPACT_TAB_PAD,
    shadowSm: SHADOW_NONE,
    shadowMd: SHADOW_HAIR,
    light: {
      card: '#ffffff',
      // Quiet ground — close to card so gutters don't dominate; glass still reads via tint
      ground: '#f3f5f8',
      border: '#dde3ea',
      hover: '#eef1f5',
      text: '#1a1d21',
      textMuted: '#5c6570',
      inputBg: '#ffffff',
      section: '#f7f8fa',
      overlay: 'rgba(15, 23, 42, 0.4)',
      chartSurface: '#ffffff',
      chartSurfaceMuted: '#f7f8fa',
      agHeaderBg: '#eef1f5',
    },
    dark: {
      card: '#1a1f29',
      ground: '#12161e',
      border: '#2e3644',
      hover: '#242b38',
      text: '#e8eaed',
      textMuted: '#9aa3b2',
      inputBg: '#12161e',
      section: '#161b24',
      overlay: 'rgba(0, 0, 0, 0.55)',
      chartSurface: '#1a1f29',
      chartSurfaceMuted: '#12161e',
      agHeaderBg: '#161b24',
    },
    glass: {
      lightBg:
        'color-mix(in srgb, #ffffff 38%, color-mix(in srgb, #dbeafe 22%, transparent))',
      darkBg: 'color-mix(in srgb, #1a1f29 42%, color-mix(in srgb, #3b82f6 8%, transparent))',
      blur: '24px',
      borderLight: 'color-mix(in srgb, #ffffff 62%, #bfdbfe 38%)',
      borderDark: 'color-mix(in srgb, #ffffff 14%, transparent)',
    },
  },
  lara: {
    id: 'lara',
    panelBorderRadius: COMPACT_RADIUS,
    tabPadding: COMPACT_TAB_PAD,
    shadowSm: SHADOW_NONE,
    shadowMd: SHADOW_HAIR,
    light: {
      card: '#ffffff',
      ground: '#eef2f6',
      border: '#d5dde6',
      hover: '#e6ebf1',
      text: '#152033',
      textMuted: '#5a6a7d',
      inputBg: '#ffffff',
      section: '#f4f6f9',
      overlay: 'rgba(15, 23, 42, 0.42)',
      chartSurface: '#ffffff',
      chartSurfaceMuted: '#f4f6f9',
      agHeaderBg: '#e6ebf1',
    },
    dark: {
      card: '#1a2332',
      ground: '#0e141d',
      border: '#2c3a4d',
      hover: '#243041',
      text: '#e8eef5',
      textMuted: '#8fa0b5',
      inputBg: '#0e141d',
      section: '#141c28',
      overlay: 'rgba(0, 0, 0, 0.58)',
      chartSurface: '#1a2332',
      chartSurfaceMuted: '#0e141d',
      agHeaderBg: '#141c28',
    },
    glass: {
      lightBg:
        'color-mix(in srgb, #ffffff 36%, color-mix(in srgb, #e0f2fe 24%, transparent))',
      darkBg: 'color-mix(in srgb, #1a2332 40%, color-mix(in srgb, #38bdf8 7%, transparent))',
      blur: '22px',
      borderLight: 'color-mix(in srgb, #ffffff 58%, #bae6fd 42%)',
      borderDark: 'color-mix(in srgb, #ffffff 12%, transparent)',
    },
  },
  nora: {
    id: 'nora',
    panelBorderRadius: COMPACT_RADIUS,
    tabPadding: COMPACT_TAB_PAD,
    shadowSm: SHADOW_NONE,
    shadowMd: SHADOW_HAIR,
    light: {
      card: '#fffcf9',
      ground: '#f4f0eb',
      border: '#e2dbd3',
      hover: '#ece6df',
      text: '#1c1917',
      textMuted: '#6b645c',
      inputBg: '#fffcf9',
      section: '#f8f5f1',
      overlay: 'rgba(41, 37, 36, 0.4)',
      chartSurface: '#fffcf9',
      chartSurfaceMuted: '#f8f5f1',
      agHeaderBg: '#ece6df',
    },
    dark: {
      card: '#221f1c',
      ground: '#161412',
      border: '#3a3530',
      hover: '#2c2824',
      text: '#f5f2ee',
      textMuted: '#a39a90',
      inputBg: '#161412',
      section: '#1b1916',
      overlay: 'rgba(0, 0, 0, 0.55)',
      chartSurface: '#221f1c',
      chartSurfaceMuted: '#161412',
      agHeaderBg: '#1b1916',
    },
    glass: {
      lightBg:
        'color-mix(in srgb, #fffcf9 40%, color-mix(in srgb, #f3e8ff 20%, transparent))',
      darkBg: 'color-mix(in srgb, #221f1c 44%, color-mix(in srgb, #a78bfa 6%, transparent))',
      blur: '24px',
      borderLight: 'color-mix(in srgb, #ffffff 55%, #e9d5ff 45%)',
      borderDark: 'color-mix(in srgb, #ffffff 11%, transparent)',
    },
  },
};

export function normalizeMtThemeFamily(raw: unknown): MtThemeFamily {
  if (raw === 'lara' || raw === 'nora' || raw === 'aura') {
    return raw;
  }
  return 'aura';
}
