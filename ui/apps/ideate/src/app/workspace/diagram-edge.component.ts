import { Component, computed, input } from '@angular/core';
import {
  NgDiagramBaseEdgeComponent,
  NgDiagramBaseEdgeLabelComponent,
  type Edge,
  type NgDiagramEdgeTemplate,
} from 'ng-diagram';

@Component({
  selector: 'ideate-diagram-edge',
  imports: [NgDiagramBaseEdgeComponent, NgDiagramBaseEdgeLabelComponent],
  template: `
    <ng-diagram-base-edge [edge]="edge()" stroke="#34d399" [strokeWidth]="1.5">
      <ng-diagram-base-edge-label [id]="edge().id + '-lbl'" [positionOnEdge]="0.5">
        <span class="elbl">{{ label() }}</span>
      </ng-diagram-base-edge-label>
    </ng-diagram-base-edge>
  `,
  styles: `
    .elbl {
      font-size: 0.7rem;
      background: var(--mt-surface-card, #1f2937);
      color: var(--mt-text-muted, #9ca3af);
      border: 1px solid var(--mt-surface-border, #374151);
      padding: 0 0.35rem;
      white-space: nowrap;
    }
  `,
})
export class DiagramEdgeComponent implements NgDiagramEdgeTemplate<{ label?: string }> {
  readonly edge = input.required<Edge<{ label?: string }>>();
  readonly label = computed(() => this.edge().data?.label ?? '');
}
