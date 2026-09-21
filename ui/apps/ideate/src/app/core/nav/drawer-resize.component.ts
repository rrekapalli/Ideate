import { Component, input, output } from '@angular/core';

@Component({
  selector: 'ideate-drawer-resize',
  template: `
    <div
      class="handle"
      [class.handle--left]="edge() === 'left'"
      [class.handle--right]="edge() === 'right'"
      role="separator"
      aria-orientation="vertical"
      [attr.aria-label]="edge() === 'left' ? 'Resize left panel' : 'Resize right panel'"
      (pointerdown)="onDown($event)"
    ></div>
  `,
  styles: `
    :host { display: contents; }
    .handle {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 140;
      touch-action: none;
    }
    .handle--left { right: -3px; }
    .handle--right { left: -3px; }
    .handle:hover, .handle:active {
      background: color-mix(in srgb, var(--primary-color) 45%, transparent);
    }
  `,
})
export class DrawerResizeComponent {
  readonly edge = input<'left' | 'right'>('left');
  readonly width = input.required<number>();
  readonly widthChange = output<number>();
  readonly dragging = output<boolean>();

  onDown(ev: PointerEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    const startX = ev.clientX;
    const startW = this.width();
    const sign = this.edge() === 'left' ? 1 : -1;
    this.dragging.emit(true);
    const move = (e: PointerEvent) => {
      this.widthChange.emit(startW + sign * (e.clientX - startX));
    };
    const up = () => {
      this.dragging.emit(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
}
