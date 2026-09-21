import { Component, OnDestroy, effect, inject, input, output, signal } from '@angular/core';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramEdgeTemplateMap,
  NgDiagramModelService,
  NgDiagramNodeTemplateMap,
  NgDiagramSelectionService,
  NgDiagramViewportService,
  initializeModel,
  provideNgDiagram,
  type NgDiagramConfig,
  type SelectionChangedEvent,
  type ViewportChangedEvent,
} from 'ng-diagram';
import { Subject, takeUntil } from 'rxjs';
import { MtButtonComponent } from '@ideate/ui';
import { GraphSnapshot, IdeaEdge, IdeaObject, OBJECT_TYPES } from '@ideate/api-client';
import { cardBox } from '../cards/card-layout';
import { DiagramCanvasBridge } from '../cards/diagram-canvas-bridge';
import { DiagramEdgeComponent } from './diagram-edge.component';
import { DiagramObjectNodeComponent } from './diagram-object-node.component';
import {
  type GraphLayoutMode,
  graphLayoutLabel,
  layoutGraph,
  nextGraphLayout,
  parseGraphLayout,
} from './graph-layout';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const FIT_PADDING = 56;
const CM_PX = 38;
const LAYOUT_STORE = 'ideate.graphLayout.v2';

@Component({
  selector: 'ideate-graph-canvas',
  imports: [NgDiagramComponent, NgDiagramBackgroundComponent, MtButtonComponent],
  providers: [provideNgDiagram()],
  template: `
    <div class="wrap">
      @if (snapshot().nodes.length === 0) {
        <div class="empty">Empty graph. Talk in Chat or use + New Thought.</div>
      }
      <ng-diagram
        [model]="model"
        [config]="config"
        [nodeTemplateMap]="nodeTemplates"
        [edgeTemplateMap]="edgeTemplates"
        (selectionChanged)="onSelection($event)"
        (viewportChanged)="onViewport($event)"
        (diagramInit)="onInit()"
      >
        <ng-diagram-background type="grid" />
      </ng-diagram>
      <div class="zoom-bar" role="toolbar" aria-label="Graph zoom">
        <input
          type="range"
          class="zoom-slider"
          min="10"
          max="400"
          step="1"
          [value]="zoomPercent()"
          [attr.aria-valuetext]="atFit() ? 'Fit' : zoomPercent() + '%'"
          aria-label="Zoom"
          (input)="onZoomSlide($event)"
        />
        <span class="zoom-label">{{ atFit() ? 'Fit' : zoomPercent() + '%' }}</span>
        <mt-button
          variant="text"
          size="sm"
          [label]="layoutLabel()"
          [ariaLabel]="'Change graph layout, current ' + layoutLabel() + '. Next ' + nextLayoutLabel()"
          (clicked)="cycleLayout()"
        />
        <mt-button variant="text" size="sm" label="Fit" ariaLabel="Fit graph" (clicked)="fit()" />
      </div>
    </div>
  `,
  styles: `
    :host, .wrap { display: block; height: 100%; position: relative; overflow: hidden; }
    .empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--mt-text-muted); pointer-events: none; z-index: 2; }
    ng-diagram {
      display: block; height: 100%;
      background-color: var(--ideate-graph-bg, #e6e8ed);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='38' height='38'%3E%3Cpath d='M38 0v38M0 38h38' fill='none' stroke='%23b8bcc6' stroke-width='1' stroke-dasharray='1.5 3.5'/%3E%3C/svg%3E");
      background-size: 1cm 1cm;
    }
    :host ::ng-deep ng-diagram-canvas { top: 0 !important; background: transparent !important; }
    :host ::ng-deep .ng-diagram-node-wrapper:not(.ng-diagram-node-selected) {
      opacity: 0.92;
    }
    :host ::ng-deep .ng-diagram-node-wrapper.ng-diagram-node-selected {
      z-index: 8;
      opacity: 1;
      box-shadow:
        0 0 0 2px var(--mt-selection-border, var(--primary-color)),
        0 0 0 6px color-mix(in srgb, var(--mt-selection-border, var(--primary-color)) 28%, transparent) !important;
    }
    :host ::ng-deep .ng-diagram-edge.ng-diagram-edge-selected path,
    :host ::ng-deep .ng-diagram-edge-selected path {
      stroke: var(--mt-primary, var(--primary-color)) !important;
      stroke-width: 2.5px !important;
    }
    :host ::ng-deep ng-diagram-background { opacity: 0; }
    :host-context(html[data-theme='dark']) ng-diagram,
    :host-context(.app-dark) ng-diagram {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='38' height='38'%3E%3Cpath d='M38 0v38M0 38h38' fill='none' stroke='%233a4150' stroke-width='1' stroke-dasharray='1.5 3.5'/%3E%3C/svg%3E");
    }
    .zoom-bar {
      position: absolute;
      right: 0.75rem;
      bottom: 0.75rem;
      z-index: 4;
      display: flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.2rem 0.3rem;
      background: var(--mt-surface-card);
      border: 1px solid var(--surface-border);
      border-radius: var(--mt-panel-border-radius, 1px);
      box-shadow: 0 1px 4px rgb(0 0 0 / 0.08);
    }
    .zoom-slider {
      width: 6.5rem;
      height: 0.7rem;
      margin: 0 0.1rem;
      padding: 0;
      background: transparent;
      accent-color: var(--mt-primary, var(--primary-color));
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
    }
    .zoom-slider::-webkit-slider-runnable-track {
      height: 2px;
      background: color-mix(in srgb, var(--mt-text, #111) 28%, transparent);
      border-radius: 1px;
    }
    .zoom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 10px;
      height: 10px;
      margin-top: -4px;
      border: 0;
      border-radius: 50%;
      background: var(--mt-primary, var(--primary-color));
    }
    .zoom-slider::-moz-range-track {
      height: 2px;
      background: color-mix(in srgb, var(--mt-text, #111) 28%, transparent);
      border: 0;
      border-radius: 1px;
    }
    .zoom-slider::-moz-range-thumb {
      width: 10px;
      height: 10px;
      border: 0;
      border-radius: 50%;
      background: var(--mt-primary, var(--primary-color));
    }
    .zoom-label {
      min-width: 2.6rem;
      text-align: center;
      font-size: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    .zoom-bar mt-button { min-width: 3.2rem; }
  `,
})
export class GraphCanvasComponent implements OnDestroy {
  readonly viewport = inject(NgDiagramViewportService);
  private readonly selection = inject(NgDiagramSelectionService);
  private readonly models = inject(NgDiagramModelService);
  private readonly bridge = inject(DiagramCanvasBridge);
  private readonly destroy$ = new Subject<void>();
  private highlighting = false;
  private ready = false;
  private syncedKey = '';
  private appliedDefaultZoom = false;
  private fittedScale: number | null = null;
  private fitting = false;
  private fitGuardUntil = 0;

  readonly snapshot = input.required<GraphSnapshot>();
  readonly open = output<IdeaObject>();
  readonly typeChange = output<{ object: IdeaObject; type: string }>();
  readonly newNode = output<IdeaObject>();
  readonly menu = output<IdeaObject>();
  readonly openChat = output<IdeaObject>();
  readonly edgeSelect = output<IdeaEdge>();
  readonly inspect = output<IdeaObject | null>();

  readonly nodeTemplates = buildNodeTemplates();
  readonly edgeTemplates = buildEdgeTemplates();
  readonly model = initializeModel({
    nodes: [],
    edges: [],
    metadata: { viewport: { x: 0, y: 0, scale: 1 } },
  });
  readonly config: NgDiagramConfig = {
    zoom: { min: MIN_ZOOM, max: MAX_ZOOM, step: 0.05 },
    edgeRouting: {
      defaultRouting: 'orthogonal',
      orthogonal: { firstLastSegmentLength: 32, maxCornerRadius: 12 },
    },
    background: {
      cellSize: { width: CM_PX, height: CM_PX },
      majorLinesFrequency: { x: 1, y: 1 },
    },
  };
  readonly zoomPercent = signal(100);
  readonly atFit = signal(true);
  readonly layoutMode = signal<GraphLayoutMode>(parseGraphLayout(localStorage.getItem(LAYOUT_STORE)));

  constructor() {
    this.bridge.open$.pipe(takeUntil(this.destroy$)).subscribe((o) => this.open.emit(o));
    this.bridge.typeChange$.pipe(takeUntil(this.destroy$)).subscribe((v) => this.typeChange.emit(v));
    this.bridge.newNode$.pipe(takeUntil(this.destroy$)).subscribe((o) => this.newNode.emit(o));
    this.bridge.menu$.pipe(takeUntil(this.destroy$)).subscribe((o) => this.menu.emit(o));
    this.bridge.openChat$.pipe(takeUntil(this.destroy$)).subscribe((o) => this.openChat.emit(o));
    effect(() => {
      const snap = this.snapshot();
      if (this.ready) {
        void this.sync(snap);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInit() {
    this.ready = true;
    this.syncZoomLabel();
    void this.sync(this.snapshot());
  }

  onViewport(ev: ViewportChangedEvent): void {
    const scale = ev.viewport?.scale ?? this.viewport.scale() ?? 1;
    this.zoomPercent.set(Math.round(scale * 100));
    if (this.fitting || Date.now() < this.fitGuardUntil) {
      this.fittedScale = scale;
      this.atFit.set(true);
      return;
    }
    if (this.fittedScale != null && Math.abs(scale - this.fittedScale) > 0.03) {
      this.atFit.set(false);
    }
  }

  onZoomSlide(ev: Event): void {
    const raw = Number((ev.target as HTMLInputElement).value);
    const pct = Number.isFinite(raw) ? Math.min(400, Math.max(10, raw)) : 100;
    this.atFit.set(false);
    this.zoomPercent.set(pct);
    void this.setScaleKeepingCenter(pct / 100);
  }

  layoutLabel(): string {
    return graphLayoutLabel(this.layoutMode());
  }

  nextLayoutLabel(): string {
    return graphLayoutLabel(nextGraphLayout(this.layoutMode()));
  }

  cycleLayout(): void {
    const next = nextGraphLayout(this.layoutMode());
    this.layoutMode.set(next);
    localStorage.setItem(LAYOUT_STORE, next);
    this.syncedKey = '';
    void this.sync(this.snapshot()).then(() => this.fitToContent());
  }

  fit(): void {
    void this.fitToContent();
  }

  onSelection(ev: SelectionChangedEvent) {
    if (this.highlighting) {
      return;
    }
    if (ev.selectedEdges.length === 1 && ev.selectedNodes.length === 0) {
      const edge = ev.selectedEdges[0];
      this.highlighting = true;
      void this.selection.select([edge.source, edge.target], [edge.id]).finally(() => {
        this.highlighting = false;
      });
      const idea = this.snapshot().edges.find((e) => e.id === edge.id);
      if (idea) {
        this.edgeSelect.emit(idea);
      }
      this.inspect.emit(null);
      return;
    }
    if (ev.selectedNodes.length === 1) {
      const data = ev.selectedNodes[0].data as { object?: IdeaObject } | undefined;
      this.inspect.emit(data?.object ?? null);
    } else {
      this.inspect.emit(null);
    }
  }

  focus(objectId: string) {
    const snap = this.snapshot();
    const node = snap.nodes.find((n) => n.id === objectId);
    if (!node) {
      return;
    }
    const edgeIds = snap.edges
        .filter((e) => e.type !== 'version-of' && (e.fromObjectId === objectId || e.toObjectId === objectId))
        .map((e) => e.id);
    this.inspect.emit(node);
    this.highlighting = true;
    void this.selection.select([objectId], edgeIds).finally(() => {
      this.highlighting = false;
    });
    const modelNode = this.models.nodes().find((n) => n.id === objectId);
    if (modelNode && !this.nodeInView(modelNode)) {
      void this.viewport.centerOnNode(objectId);
    }
  }

  private async sync(snap: GraphSnapshot) {
    const visible = snap.nodes;
    const key = this.layoutMode() + '|' + visible.map((n) => n.id + n.updatedAt).join(',') + '|' + snap.edges.map((e) => e.id).join(',');
    if (key === this.syncedKey) {
      return;
    }
    this.syncedKey = key;
    const currentNodeIds = this.models.nodes().map((n) => n.id);
    const currentEdgeIds = this.models.edges().map((e) => e.id);
    if (currentEdgeIds.length) {
      await this.models.deleteEdges(currentEdgeIds);
    }
    if (currentNodeIds.length) {
      await this.models.deleteNodes(currentNodeIds);
    }
    const visibleIdSet = new Set(visible.map((n) => n.id));
    const visibleEdges = snap.edges.filter((e) =>
      e.type !== 'version-of' && visibleIdSet.has(e.fromObjectId) && visibleIdSet.has(e.toObjectId),
    );
    if (visible.length) {
      const placed = layoutGraph(
        visible.map((n) => ({ id: n.id, type: n.type, ...cardBox(n) })),
        visibleEdges.map((e) => ({ from: e.fromObjectId, to: e.toObjectId })),
        this.layoutMode(),
      );
      const pos = new Map(placed.map((p) => [p.id, p]));
      await this.models.addNodes(visible.map((n) => {
        const box = cardBox(n);
        const p = pos.get(n.id);
        return {
          id: n.id,
          type: n.type,
          position: { x: p?.x ?? 72, y: p?.y ?? 72 },
          size: box,
          autoSize: true,
          data: { label: `${n.displayId} · ${n.title}`, object: n },
        };
      }), { waitForMeasurements: true });
    }
    if (visibleEdges.length) {
      await this.models.addEdges(visibleEdges.map((e) => ({
        id: e.id,
        type: 'labeled',
        source: e.fromObjectId,
        target: e.toObjectId,
        sourcePort: 'out',
        targetPort: 'in',
        routing: 'orthogonal',
        data: { label: e.why ? `${e.type} · ${e.why}` : e.type, edge: e },
      })));
    }
    if (visible.length && !this.appliedDefaultZoom) {
      this.appliedDefaultZoom = true;
      await this.fitToContent();
    }
  }

  private nodeInView(node: { position: { x: number; y: number }; size?: { width?: number; height?: number } }): boolean {
    const v = this.viewport.viewport();
    const scale = v.scale || 1;
    const w = node.size?.width ?? 240;
    const h = node.size?.height ?? 160;
    const left = node.position.x * scale + v.x;
    const top = node.position.y * scale + v.y;
    const right = left + w * scale;
    const bottom = top + h * scale;
    const vw = v.width ?? 0;
    const vh = v.height ?? 0;
    return right > 24 && bottom > 24 && left < vw - 24 && top < vh - 24;
  }

  private async fitToContent(): Promise<void> {
    this.fitting = true;
    try {
      if (this.models.nodes().length === 0) {
        await this.viewport.setViewport(0, 0, 1);
        this.fittedScale = 1;
        this.atFit.set(true);
        this.syncZoomLabel();
        return;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await this.viewport.zoomToFit({ padding: FIT_PADDING });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      this.fittedScale = this.viewport.viewport().scale || this.viewport.scale() || 1;
      this.atFit.set(true);
      this.fitGuardUntil = Date.now() + 500;
      this.syncZoomLabel();
    } finally {
      this.fitting = false;
    }
  }

  private syncZoomLabel(): void {
    const scale = this.viewport.scale() || 1;
    this.zoomPercent.set(Math.round(scale * 100));
  }

  private async setScaleKeepingCenter(scale: number): Promise<void> {
    const v = this.viewport.viewport();
    const width = v.width ?? 0;
    const height = v.height ?? 0;
    const current = v.scale || 1;
    const cx = (width / 2 - v.x) / current;
    const cy = (height / 2 - v.y) / current;
    await this.viewport.setViewport(width / 2 - cx * scale, height / 2 - cy * scale, scale);
  }
}

function buildNodeTemplates(): NgDiagramNodeTemplateMap {
  const map = new NgDiagramNodeTemplateMap();
  for (const type of OBJECT_TYPES) {
    map.set(type, DiagramObjectNodeComponent);
  }
  map.set('default', DiagramObjectNodeComponent);
  return map;
}

function buildEdgeTemplates(): NgDiagramEdgeTemplateMap {
  const map = new NgDiagramEdgeTemplateMap();
  map.set('labeled', DiagramEdgeComponent);
  map.set('default', DiagramEdgeComponent);
  return map;
}
