import { Component, input, output, signal } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import { MtButtonComponent } from '@ideate/ui';
import { TypeGlyphComponent } from '../shared/type-glyph.component';
import { PracticeGap, StudentHomeModel } from './student-home';

@Component({
  selector: 'ideate-student-home',
  imports: [MtButtonComponent, TypeGlyphComponent],
  template: `
    <section class="strip" [class.strip--open]="open()">
      <header>
        <div class="lead">
          <p class="q">What am I trying to understand, and what do I still confuse?</p>
          @if (home().currentConcept; as concept) {
            <p class="current">
              Current concept
              <button type="button" class="link" (click)="focus.emit(concept)">
                <ideate-type-glyph [type]="concept.type" [size]="12" />
                {{ concept.displayId }} {{ concept.title }}
              </button>
            </p>
          } @else {
            <p class="current muted">No concept on this graph yet. Talk in Chat to grow one.</p>
          }
        </div>
        <mt-button
          variant="icon"
          size="sm"
          [icon]="open() ? 'expand_less' : 'expand_more'"
          [ariaLabel]="open() ? 'Collapse understanding home' : 'Expand understanding home'"
          (clicked)="open.set(!open())"
        />
      </header>
      @if (open()) {
        <div class="cols">
          <div>
            <h3>Open unknowns</h3>
            @for (n of home().openUnknowns; track n.id) {
              <button type="button" class="row" (click)="focus.emit(n)">
                <ideate-type-glyph [type]="n.type" [size]="12" />
                {{ n.displayId }} {{ n.title }}
              </button>
            } @empty {
              <p class="muted">None still open.</p>
            }
          </div>
          <div>
            <h3>Misconceptions in play</h3>
            @for (n of home().misconceptionsInPlay; track n.id) {
              <button type="button" class="row" (click)="focus.emit(n)">
                <ideate-type-glyph [type]="n.type" [size]="12" />
                {{ n.displayId }} {{ n.title }}
              </button>
            } @empty {
              <p class="muted">None still in play.</p>
            }
          </div>
          <div>
            <h3>Practice gaps</h3>
            @for (gap of home().practiceGaps; track gap.kind + gap.object.id) {
              <button type="button" class="row" (click)="practice.emit(gap)">
                <ideate-type-glyph [type]="gap.object.type" [size]="12" />
                {{ gap.label }}
              </button>
            } @empty {
              <p class="muted">No gaps listed.</p>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .strip {
      flex: none;
      border-bottom: 1px solid var(--mt-surface-border, var(--surface-border));
      background: color-mix(in srgb, var(--ideate-persona-student, var(--mt-primary)) 8%, var(--mt-surface-card, #fff));
      padding: 0.4rem 0.7rem 0.45rem;
    }
    header { display: flex; gap: 0.5rem; align-items: flex-start; justify-content: space-between; }
    .q { margin: 0; font-size: 0.82rem; font-weight: 650; }
    .current { margin: 0.2rem 0 0; font-size: 0.75rem; color: var(--mt-text-muted); }
    .link {
      display: inline-flex; align-items: center; gap: 0.2rem;
      margin-left: 0.3rem; padding: 0; border: 0; background: none;
      color: var(--mt-primary); font: inherit; cursor: pointer;
    }
    .cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; margin-top: 0.45rem; }
    h3 { margin: 0 0 0.2rem; font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--mt-text-muted); }
    .row {
      display: flex; align-items: center; gap: 0.28rem; width: 100%;
      padding: 0.18rem 0.1rem; border: 0; background: none; color: inherit;
      font: inherit; font-size: 0.75rem; text-align: left; cursor: pointer;
    }
    .row:hover { color: var(--mt-primary); }
    .muted { margin: 0; font-size: 0.72rem; color: var(--mt-text-muted); }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class StudentHomeComponent {
  readonly home = input.required<StudentHomeModel>();
  readonly focus = output<IdeaObject>();
  readonly practice = output<PracticeGap>();
  readonly open = signal(true);
}
