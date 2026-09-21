import { NgComponentOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import {
  NgDiagramNodeTemplate,
  NgDiagramPortComponent,
  type Node,
} from 'ng-diagram';
import { CARD_COMPONENTS } from '../cards/card-registry';
import { ThoughtCardComponent } from '../cards/thought-card.component';

export type DiagramObjectData = { label: string; object: IdeaObject };

@Component({
  selector: 'ideate-diagram-object-node',
  imports: [NgComponentOutlet, NgDiagramPortComponent],
  template: `
    <div class="node" [class.is-selected]="selected()">
      @if (selected()) {
        <span class="mark">Selected</span>
      }
      <ng-container [ngComponentOutlet]="card()" [ngComponentOutletInputs]="inputs()" />
      <ng-diagram-port id="in" side="left" type="target" />
      <ng-diagram-port id="out" side="right" type="source" />
    </div>
  `,
  styles: `
    :host, .node { display: block; position: relative; }
    ng-diagram-port { position: absolute; top: 50%; }
    .node.is-selected {
      outline: 2px solid var(--mt-selection-border, var(--primary-color, var(--mt-primary)));
      outline-offset: 2px;
      border-radius: var(--mt-panel-border-radius, 2px);
      box-shadow:
        0 0 0 5px color-mix(in srgb, var(--mt-selection-border, var(--primary-color)) 32%, transparent),
        var(--mt-focus-ring);
    }
    .mark {
      position: absolute;
      top: -0.65rem;
      left: 0.4rem;
      z-index: 2;
      background: var(--mt-primary, var(--primary-color));
      color: var(--mt-on-primary, #fff);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      line-height: 1;
      padding: 0.16rem 0.32rem;
      border-radius: var(--mt-panel-border-radius, 1px);
    }
  `,
})
export class DiagramObjectNodeComponent implements NgDiagramNodeTemplate<DiagramObjectData> {
  readonly node = input.required<Node<DiagramObjectData>>();

  readonly object = computed(() => this.node().data.object);

  readonly selected = computed(() => !!this.node().selected);

  readonly card = computed(() => CARD_COMPONENTS[this.object().type] ?? ThoughtCardComponent);

  readonly inputs = computed(() => ({ object: this.object() }));
}
