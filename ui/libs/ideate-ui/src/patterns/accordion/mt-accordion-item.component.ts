import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild, input } from '@angular/core';

@Component({
  selector: 'mt-accordion-item',
  standalone: true,
  template: `<ng-template #content><ng-content /></ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtAccordionItemComponent {
  /** Non-required: contentChildren can appear before bindings are applied (NG0950). */
  readonly value = input<string | undefined>(undefined);
  readonly header = input('');
  readonly disabled = input(false);

  @ViewChild('content', { static: true })
  contentTpl!: TemplateRef<unknown>;
}
