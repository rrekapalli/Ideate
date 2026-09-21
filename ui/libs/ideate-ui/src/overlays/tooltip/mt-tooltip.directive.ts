import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

/** Native title tooltip (CDK Overlay version deferred until needed). */
@Directive({
  selector: '[mtTooltip]',
  standalone: true,
})
export class MtTooltipDirective {
  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
  ) {}

  @Input('mtTooltip')
  set text(v: string) {
    this.renderer.setAttribute(this.el.nativeElement, 'title', v ?? '');
  }
}
