import { Injectable, inject } from '@angular/core';
import { applyMoneytreeAppearance, MONEYTREE_UI_CONFIG, type MtAppearancePreference } from '@ideate/ui';

const STORAGE_KEY = 'ideate.appearance.v2';

export const DEFAULT_APPEARANCE: MtAppearancePreference = {
  colorMode: 'light',
  accentPalette: 'emerald',
  fontSize: 1,
  fontFamily: 'system',
  themeFamily: 'nora',
  glassEffect: false,
};

function readStored(): MtAppearancePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly ui = inject(MONEYTREE_UI_CONFIG, { optional: true });
  private last = readStored();
  private media?: MediaQueryList;

  constructor() {
    this.apply(this.last);
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.media = window.matchMedia('(prefers-color-scheme: dark)');
      this.media.addEventListener('change', () => {
        if (this.last.colorMode === 'system') this.apply(this.last);
      });
    }
  }

  getLastApplied(): MtAppearancePreference {
    return { ...this.last };
  }

  setAppearance(pref: MtAppearancePreference): MtAppearancePreference {
    this.last = { ...DEFAULT_APPEARANCE, ...pref };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.last));
    } catch {
      /* ignore quota */
    }
    this.apply(this.last);
    return this.getLastApplied();
  }

  private apply(pref: MtAppearancePreference): void {
    applyMoneytreeAppearance(document, pref, {
      darkModeSelector: this.ui?.darkModeSelector ?? '.app-dark',
    });
  }
}
