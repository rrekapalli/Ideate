import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MT_ICON_PATHS, resolveMtIconName } from './icon-map';

@Component({
  selector: 'mt-icon',
  standalone: true,
  template: `
    <svg
      class="mt-icon"
      [class.mt-icon--spin]="spin()"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path [attr.d]="path()" fill="currentColor" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
        vertical-align: middle;
      }
      .mt-icon {
        display: block;
      }
      .mt-icon--spin {
        animation: mt-spin 0.8s linear infinite;
      }
      @keyframes mt-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtIconComponent {
  readonly name = input.required<string>();
  readonly size = input<number | string>(16);
  readonly spin = input(false);

  readonly path = computed(() => {
    const resolved = resolveMtIconName(this.name());
    return MT_ICON_PATHS[resolved] ?? MT_ICON_PATHS['info'];
  });
}
