import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild, input } from '@angular/core';

@Component({
  selector: 'mt-tab',
  standalone: true,
  template: `<ng-template #content><ng-content /></ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtTabComponent {
  /** Non-required: contentChildren can appear before bindings are applied (NG0950). */
  readonly value = input<string | number | undefined>(undefined);
  readonly label = input('');
  readonly disabled = input(false);

  @ViewChild('content', { static: true })
  contentTpl!: TemplateRef<unknown>;
}
