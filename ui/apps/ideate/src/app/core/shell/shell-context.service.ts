import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';

export type AppLeftDrawer = 'workspaces' | 'objects' | 'documents' | 'branches' | null;

@Injectable({ providedIn: 'root' })
export class ShellContextService {
  readonly workspaceName = signal<string | null>(null);
  readonly workspaceMeta = signal('');
  readonly credits = signal<number | null>(null);
  readonly usageMinor = signal<number | null>(null);
  readonly searchEnabled = signal(false);
  readonly searchQuery = signal('');
  readonly searchSubmit = new Subject<string>();
  readonly settingsClick = new Subject<void>();
  readonly newThoughtClick = new Subject<void>();
  readonly workspacesChanged = new Subject<void>();
  readonly requestCreateWorkspace = new Subject<void>();
  readonly leftDrawer = signal<AppLeftDrawer>('workspaces');
  readonly leftDrawerWidth = signal(readStoredWidth('left', 280));
  readonly rightDrawerWidth = signal(readStoredWidth('right', 320));
  readonly resizing = signal(false);
  readonly inWorkspace = computed(() => !!this.workspaceName());
  readonly workspacesDrawerOpen = computed(() => this.inWorkspace() && this.leftDrawer() === 'workspaces');
  readonly showLeftNav = computed(() => this.inWorkspace());
  readonly explorerDrawerOpen = computed(() => {
    const d = this.leftDrawer();
    return d === 'objects' || d === 'documents' || d === 'branches';
  });

  toggleLeft(id: Exclude<AppLeftDrawer, null>): void {
    this.leftDrawer.update((cur) => (cur === id ? null : id));
  }

  closeLeft(): void {
    this.leftDrawer.set(null);
  }

  setLeftDrawerWidth(px: number): void {
    const next = clampDrawerWidth(px);
    this.leftDrawerWidth.set(next);
    writeStoredWidth('left', next);
  }

  setRightDrawerWidth(px: number): void {
    const next = clampDrawerWidth(px);
    this.rightDrawerWidth.set(next);
    writeStoredWidth('right', next);
  }

  /** Home has no left rail; workspace create/manage lives in the page. */
  showHomeDashboard(): void {
    this.leftDrawer.set(null);
  }

  bindWorkspace(name: string, meta: string, credits: number, usageMinor: number): void {
    this.workspaceName.set(name);
    this.workspaceMeta.set(meta);
    this.credits.set(credits);
    this.usageMinor.set(usageMinor);
    this.searchEnabled.set(true);
    if (this.leftDrawer() === 'workspaces') {
      this.leftDrawer.set(null);
    }
  }

  clearWorkspace(): void {
    this.workspaceName.set(null);
    this.workspaceMeta.set('');
    this.credits.set(null);
    this.usageMinor.set(null);
    this.searchEnabled.set(false);
    this.searchQuery.set('');
    this.leftDrawer.set(null);
  }
}

const WIDTH_KEY = 'ideate.drawer-widths';
const MIN_DRAWER = 220;
const MAX_DRAWER = 560;

export function clampDrawerWidth(px: number): number {
  return Math.min(MAX_DRAWER, Math.max(MIN_DRAWER, Math.round(px)));
}

function readStoredWidth(side: 'left' | 'right', fallback: number): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return typeof v[side] === 'number' ? clampDrawerWidth(v[side]) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredWidth(side: 'left' | 'right', px: number): void {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    const v = raw ? JSON.parse(raw) : {};
    v[side] = px;
    localStorage.setItem(WIDTH_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function readStoredRightWidth(): number {
  return readStoredWidth('right', 320);
}

export function writeStoredRightWidth(px: number): void {
  writeStoredWidth('right', clampDrawerWidth(px));
}
