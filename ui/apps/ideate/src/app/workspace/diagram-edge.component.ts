import { Component, computed, input } from '@angular/core';
import {
  NgDiagramBaseEdgeComponent,
  NgDiagramBaseEdgeLabelComponent,
  type Edge,
  type NgDiagramEdgeTemplate,
} from 'ng-diagram';
import { IdeaEdge, edgeTooltip, edgeTypeIcon, edgeTypeTone } from '@ideate/api-client';
import { MtIconComponent } from '@ideate/ui';

type EdgeData = { label?: string; edge?: IdeaEdge };

const STROKE: Record<string, string> = {
  support: '#34d399',
  oppose: '#f59e0b',
  neutral: '#94a3b8',
};

@Component({
  selector: 'ideate-diagram-edge',
  imports: [NgDiagramBaseEdgeComponent, NgDiagramBaseEdgeLabelComponent, MtIconComponent],
  template: `
    <ng-diagram-base-edge [edge]="edge()" [stroke]="stroke()" [strokeWidth]="1.5">
      <ng-diagram-base-edge-label [id]="edge().id + '-lbl'" [positionOnEdge]="0.5">
        <button
          type="button"
          class="emark"
          [class.support]="tone() === 'support'"
          [class.oppose]="tone() === 'oppose'"
          [attr.aria-label]="tip()"
        >
          <mt-icon [name]="icon()" [size]="13" />
          <span class="tip" role="tooltip">{{ tip() }}</span>
        </button>
      </ng-diagram-base-edge-label>
    </ng-diagram-base-edge>
  `,
  styles: `
    :host { pointer-events: none; }
    .emark {
      pointer-events: auto;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4rem;
      height: 1.4rem;
      padding: 0;
      border-radius: 999px;
      border: 1.5px solid color-mix(in srgb, var(--mt-text, #334155) 45%, transparent);
      background: var(--mt-surface-card, #fff);
      color: var(--mt-text, #334155);
      cursor: pointer;
      line-height: 0;
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--mt-surface-card, #fff) 88%, transparent);
    }
    .emark.support {
      color: #059669;
      border-color: #34d399;
      background: color-mix(in srgb, #34d399 16%, var(--mt-surface-card, #fff));
    }
    .emark.oppose {
      color: #b45309;
      border-color: #f59e0b;
      background: color-mix(in srgb, #f59e0b 16%, var(--mt-surface-card, #fff));
    }
    .tip {
      position: absolute;
      left: 50%;
      bottom: calc(100% + 0.35rem);
      transform: translateX(-50%);
      min-width: 6rem;
      max-width: 16rem;
      padding: 0.2rem 0.45rem;
      border-radius: 3px;
      border: 1px solid var(--mt-surface-border, #374151);
      background: var(--mt-surface-card, #111827);
      color: var(--mt-text, #e5e7eb);
      font-size: 0.7rem;
      line-height: 1.25;
      white-space: normal;
      text-align: center;
      box-shadow: 0 2px 8px rgb(0 0 0 / 0.18);
      opacity: 0;
      pointer-events: none;
      z-index: 12;
    }
    .emark:hover .tip,
    .emark:focus-visible .tip {
      opacity: 1;
    }
    .emark:focus-visible {
      outline: 2px solid var(--mt-primary, #34d399);
      outline-offset: 1px;
    }
  `,
})
export class DiagramEdgeComponent implements NgDiagramEdgeTemplate<EdgeData> {
  readonly edge = input.required<Edge<EdgeData>>();
  readonly idea = computed(() => this.edge().data?.edge);
  readonly tone = computed(() => edgeTypeTone(this.idea()?.type));
  readonly icon = computed(() => edgeTypeIcon(this.idea()?.type));
  readonly tip = computed(() => {
    const idea = this.idea();
    if (idea) {
      return edgeTooltip(idea.type, idea.why);
    }
    return this.edge().data?.label ?? '';
  });
  readonly stroke = computed(() => STROKE[this.tone()] ?? STROKE['neutral']);
}
