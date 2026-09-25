import { Component, computed, input } from '@angular/core';
import { WorkspaceReportVersion } from '@ideate/api-client';
import { MdViewComponent } from '../shared/md-view.component';
import { MtProgressComponent } from '@ideate/ui';
import { cleanReportBody, reportFileName, resolveReportTitle } from './report-display';

@Component({
  selector: 'ideate-report-page',
  imports: [MdViewComponent, MtProgressComponent],
  template: `
    <article class="page">
      @if (generating() && !version()?.body) {
        <div class="generating" aria-live="polite" aria-busy="true">
          <mt-progress size="lg" ariaLabel="Generating report" />
          <p class="title">Generating report…</p>
          <p class="hint">{{ generatingHint() }}</p>
        </div>
      } @else if (error() && !version()?.body) {
        <div class="failed" role="alert">
          <p class="title">Report did not finish</p>
          <p class="hint">{{ error() }}</p>
        </div>
      } @else if (version(); as ver) {
        @if (generating()) {
          <div class="banner" aria-live="polite" aria-busy="true">
            <mt-progress size="sm" ariaLabel="Generating updated report" />
            <span>Generating an updated report…</span>
          </div>
        }
        <header>
          <p class="kicker">{{ fileLabel() }} · v{{ ver.version }}</p>
          <h1>{{ heading() }}</h1>
          @if (lede()) {
            <p class="lede">{{ lede() }}</p>
          }
        </header>
        <ideate-md [source]="body()" [diagrams]="true" />
      } @else {
        <div class="empty">
          <p class="hint">Select a report to open it, or Prepare to generate one from the graph.</p>
        </div>
      }
    </article>
  `,
  styles: `
    :host { display: block; height: 100%; overflow: auto; }
    .page {
      max-width: 46rem;
      margin: 0 auto;
      padding: 1.25rem 1.5rem 2.5rem;
    }
    .kicker {
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--mt-text-muted);
    }
    h1 {
      margin: 0 0 0.6rem;
      font-size: 1.35rem;
      font-weight: 650;
      line-height: 1.25;
    }
    .lede {
      margin: 0 0 1.1rem;
      color: var(--mt-text-muted);
      line-height: 1.45;
    }
    .generating, .failed, .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 16rem;
      gap: 0.65rem;
      text-align: center;
    }
    .title { margin: 0; font-size: 1rem; font-weight: 650; }
    .hint { margin: 0; color: var(--mt-text-muted); font-size: 0.85rem; line-height: 1.4; max-width: 28rem; }
    .banner {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin: 0 0 1rem;
      padding: 0.45rem 0.65rem;
      font-size: 0.82rem;
      color: var(--mt-text-muted);
      background: color-mix(in srgb, var(--mt-primary, #10b981) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--mt-primary, #10b981) 22%, transparent);
    }
  `,
})
export class ReportPageComponent {
  readonly version = input<WorkspaceReportVersion | null>(null);
  readonly generating = input(false);
  readonly jobStatus = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly workspaceName = input('');
  readonly questionTitle = input('');

  readonly heading = computed(() =>
    resolveReportTitle({
      versionTitle: this.version()?.title,
      body: this.version()?.body,
      workspaceName: this.workspaceName(),
      questionTitle: this.questionTitle(),
    }),
  );

  readonly lede = computed(() => {
    const summary = cleanReportBody(this.version()?.summary, this.heading());
    const title = this.heading().toLowerCase().replace(/[^\w\s]/g, '').trim();
    const text = summary.toLowerCase().replace(/[^\w\s]/g, '').trim();
    if (!summary || !text || text === title) {
      return '';
    }
    return summary;
  });

  readonly body = computed(() => cleanReportBody(this.version()?.body, this.heading()));

  readonly fileLabel = computed(() => reportFileName(this.heading()));

  readonly generatingHint = computed(() => {
    if (this.jobStatus() === 'queued') {
      return 'The job is queued. The markdown will appear in this tab when generation finishes.';
    }
    return 'Writing markdown from the current graph. This tab will fill in when the job finishes.';
  });
}
