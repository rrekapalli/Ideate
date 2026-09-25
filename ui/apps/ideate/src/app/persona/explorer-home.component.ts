import { Component, input, output, signal } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import { MtButtonComponent } from '@ideate/ui';
import { TypeGlyphComponent } from '../shared/type-glyph.component';
import { ExplorerHomeModel } from './explorer-home';

@Component({
  selector: 'ideate-explorer-home',
  imports: [MtButtonComponent, TypeGlyphComponent],
  template: `
    <section class="strip" [class.strip--open]="open()">
      <header>
        <div class="lead">
          <p class="q">What thought is growing, and what should we not pretend to know?</p>
          @if (home().growingThought; as thought) {
            <p class="current">
              Growing thought
              <button type="button" class="link" (click)="focus.emit(thought)">
                <ideate-type-glyph [type]="thought.type" [size]="12" />
                {{ thought.displayId }} {{ thought.title }}
              </button>
            </p>
          } @else {
            <p class="current muted">No thought yet.</p>
          }
        </div>
        <div class="hdr-side">
          <mt-button size="sm" variant="outlined" label="Clone to Researcher" (clicked)="cloneResearcher.emit()" />
          <mt-button size="sm" variant="outlined" label="Clone to Inventor" (clicked)="cloneInventor.emit()" />
          <mt-button
            variant="icon"
            size="sm"
            [icon]="open() ? 'expand_less' : 'expand_more'"
            [ariaLabel]="open() ? 'Collapse growing-thought home' : 'Expand growing-thought home'"
            (clicked)="open.set(!open())"
          />
        </div>
      </header>
      @if (open()) {
        <div class="cols">
          <div>
            <h3>Must not pretend to know</h3>
            @for (n of home().unknowns; track n.id) {
              <button type="button" class="row" (click)="focus.emit(n)">
                <ideate-type-glyph [type]="n.type" [size]="12" />
                {{ n.displayId }} {{ n.title }}
              </button>
            } @empty {
              <p class="muted">No unknowns on this graph.</p>
            }
          </div>
          <div>
            <h3>Dropped</h3>
            @for (item of home().dropped; track item.object.id) {
              <button type="button" class="row" (click)="focus.emit(item.object)">
                <ideate-type-glyph [type]="item.object.type" [size]="12" />
                {{ item.object.displayId }} {{ item.object.title }}
                @if (item.why) {
                  <span class="why">{{ item.why }}</span>
                }
              </button>
            } @empty {
              <p class="muted">Nothing dropped yet.</p>
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
      background: color-mix(in srgb, var(--ideate-persona-explorer, var(--mt-primary)) 8%, var(--mt-surface-card, #fff));
      padding: 0.4rem 0.7rem 0.45rem;
    }
    header { display: flex; gap: 0.5rem; align-items: flex-start; justify-content: space-between; }
    .hdr-side { display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: flex-start; justify-content: flex-end; }
    .q { margin: 0; font-size: 0.82rem; font-weight: 650; }
    .current { margin: 0.2rem 0 0; font-size: 0.75rem; color: var(--mt-text-muted); }
    .link {
      display: inline-flex; align-items: center; gap: 0.2rem;
      margin-left: 0.3rem; padding: 0; border: 0; background: none;
      color: var(--mt-primary); font: inherit; cursor: pointer;
    }
    .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; margin-top: 0.45rem; }
    h3 { margin: 0 0 0.2rem; font-size: 0.68rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--mt-text-muted); }
    .row {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0.28rem; width: 100%;
      padding: 0.18rem 0.1rem; border: 0; background: none; color: inherit;
      font: inherit; font-size: 0.75rem; text-align: left; cursor: pointer;
    }
    .row:hover { color: var(--mt-primary); }
    .why { flex: 1 1 100%; margin-left: 1.4rem; font-size: 0.68rem; color: var(--mt-text-muted); }
    .muted { margin: 0; font-size: 0.72rem; color: var(--mt-text-muted); }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
  `,
})
export class ExplorerHomeComponent {
  readonly home = input.required<ExplorerHomeModel>();
  readonly focus = output<IdeaObject>();
  readonly cloneResearcher = output<void>();
  readonly cloneInventor = output<void>();
  readonly open = signal(true);
}
