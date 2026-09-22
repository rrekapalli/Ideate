import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { lookupLabel, objectTypeIcon } from '@ideate/api-client';
import { MtIconComponent } from '@ideate/ui';

@Component({
  selector: 'ideate-type-glyph',
  imports: [MtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mt-icon
      [name]="objectTypeIcon(type())"
      [size]="size()"
      [attr.data-object-type]="type()"
    />
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      line-height: 0;
      color: var(--ideate-type-color, currentColor);
    }
  `,
  host: {
    '[style.--ideate-type-color]': 'colorVar()',
    '[attr.title]': 'label()',
  },
})
export class TypeGlyphComponent {
  readonly type = input.required<string>();
  readonly size = input<number | string>(14);
  readonly objectTypeIcon = objectTypeIcon;

  colorVar(): string {
    const key = (this.type() || 'unknown').replace(/[^a-z0-9_]/gi, '');
    return `var(--ideate-type-${key}, var(--mt-text-muted, currentColor))`;
  }

  label(): string {
    return lookupLabel(this.type());
  }
}
