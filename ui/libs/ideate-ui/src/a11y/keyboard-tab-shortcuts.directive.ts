import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { MtTabsComponent } from '../primitives/tabs/mt-tabs.component';

export interface MtTabShortcutDef {
  key: string;
  tabValue: string | number;
  label?: string;
}

/**
 * Host on `mt-tabs[keyboardTabShortcuts]`. Registers Alt+Shift+letter listeners
 * that select the matching tab. Apps that still use Prime `p-tabs` keep the old
 * directive until W4 page migration.
 */
@Directive({
  selector: 'mt-tabs[keyboardTabShortcuts]',
  standalone: true,
})
export class MtKeyboardTabShortcutsDirective implements OnChanges, OnDestroy, AfterViewInit {
  @Input({ required: true }) tabShortcuts: readonly MtTabShortcutDef[] = [];
  @Input() tabShortcutsEnabled = true;

  constructor(
    private readonly tabs: MtTabsComponent,
    private readonly el: ElementRef<HTMLElement>,
  ) {}

  private readonly onKey = (ev: KeyboardEvent) => {
    if (!this.tabShortcutsEnabled || !ev.altKey || !ev.shiftKey || ev.ctrlKey || ev.metaKey) {
      return;
    }
    const key = ev.key.length === 1 ? ev.key.toLowerCase() : '';
    if (!key) {
      return;
    }
    const hit = this.tabShortcuts.find((s) => s.key.toLowerCase() === key);
    if (!hit) {
      return;
    }
    ev.preventDefault();
    this.tabs.select(hit.tabValue);
  };

  ngAfterViewInit(): void {
    this.el.nativeElement.ownerDocument?.addEventListener('keydown', this.onKey);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // bindings refreshed via inputs; listener is stable
  }

  ngOnDestroy(): void {
    this.el.nativeElement.ownerDocument?.removeEventListener('keydown', this.onKey);
  }
}
