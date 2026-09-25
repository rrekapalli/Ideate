import { Component, input, output, signal } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import { MtButtonComponent } from '@ideate/ui';
import { TypeGlyphComponent } from '../shared/type-glyph.component';
import { ProductHomeModel } from './product-home';

@Component({
  selector: 'ideate-product-home',
  imports: [MtButtonComponent, TypeGlyphComponent],
  template: `
    <section class="strip" [class.strip--open]="open()">
      <header>
        <div class="lead">
          <p class="q">{{ question() }}</p>
          @if (home().pinnedProblem; as problem) {
            <p class="current">
              Problem
              <button type="button" class="link" (click)="focus.emit(problem)">
                <ideate-type-glyph [type]="problem.type" [size]="12" />
                {{ problem.displayId }} {{ problem.title }}
              </button>
            </p>
          } @else {
            <p class="current muted">No problem pinned yet. Pin a Question from its card.</p>
          }
        </div>
        <mt-button
          variant="icon"
          size="sm"
          [icon]="open() ? 'expand_less' : 'expand_more'"
          [ariaLabel]="open() ? 'Collapse product home' : 'Expand product home'"
          (clicked)="open.set(!open())"
        />
      </header>
      @if (open()) {
        <div class="cols">
          <div>
            <h3>Live bets</h3>
            @for (n of home().liveBets; track n.id) {
              <button type="button" class="row" (click)="focus.emit(n)">
                <ideate-type-glyph [type]="n.type" [size]="12" />
                {{ n.displayId }} {{ n.title }}
              </button>
            } @empty {
              <p class="muted">No live bets.</p>
            }
          </div>
          <div>
            <h3>Open assumptions</h3>
            @for (n of home().openAssumptions; track n.id) {
              <button type="button" class="row" (click)="focus.emit(n)">
                <ideate-type-glyph [type]="n.type" [size]="12" />
                {{ n.displayId }} {{ n.title }}
              </button>
            } @empty {
              <p class="muted">None open.</p>
            }
          </div>
          <div>
            <h3>Decisions</h3>
            @for (n of home().decisions; track n.id) {
              <button type="button" class="row" (click)="focus.emit(n)">
                <ideate-type-glyph [type]="n.type" [size]="12" />
                {{ n.displayId }} {{ n.title }}
                @if (disposition(n); as d) {
                  <span class="disp">{{ d }}</span>
                }
              </button>
            } @empty {
              <p class="muted">No decisions yet.</p>
            }
          </div>
          <div>
            <h3>Killed bets</h3>
            @for (row of home().killedBets; track row.object.id) {
              <button type="button" class="row" (click)="focus.emit(row.object)">
                <ideate-type-glyph [type]="row.object.type" [size]="12" />
                {{ row.object.displayId }} {{ row.object.title }}
                @if (row.why) {
                  <span class="why">{{ row.why }}</span>
                }
              </button>
            } @empty {
              <p class="muted">None killed.</p>
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
      background: color-mix(in srgb, var(--ideate-persona-analyst, var(--mt-primary)) 8%, var(--mt-surface-card, #fff));
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
    .cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.6rem; margin-top: 0.45rem; }
    h3 { margin: 0 0 0.2rem; font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--mt-text-muted); }
    .row {
      display: flex; align-items: center; gap: 0.28rem; width: 100%;
      padding: 0.18rem 0.1rem; border: 0; background: none; color: inherit;
      font: inherit; font-size: 0.75rem; text-align: left; cursor: pointer;
    }
    .row:hover { color: var(--mt-primary); }
    .disp, .why { color: var(--mt-text-muted); font-size: 0.68rem; }
    .muted { margin: 0; font-size: 0.72rem; color: var(--mt-text-muted); }
    @media (max-width: 1100px) { .cols { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 700px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class ProductHomeComponent {
  readonly home = input.required<ProductHomeModel>();
  readonly question = input('Why this decision, and what would change our mind?');
  readonly focus = output<IdeaObject>();
  readonly open = signal(true);

  disposition(object: IdeaObject): string | null {
    const value = object.details?.['disposition'];
    return value == null ? null : String(value);
  }
}
