import { Component, input, output } from '@angular/core';
import { IdeaObject, TranscriptMessage } from '@ideate/api-client';
import { ObjectCardChromeComponent } from '../cards/object-card-chrome.component';
import { MtButtonComponent } from '@ideate/ui';

@Component({
  selector: 'ideate-object-page',
  imports: [ObjectCardChromeComponent, MtButtonComponent],
  template: `
    <div class="page">
      <ideate-object-card-chrome
        [object]="object()"
        (open)="noop()"
        (typeChange)="typeChange.emit($event)"
        (newNode)="newNode.emit($event)"
        (menu)="menu.emit($event)"
        (openChat)="openChat.emit($event)"
      />
      <article class="body">
        <h2>{{ object().title }}</h2>
        <p class="meta">{{ object().displayId }} · {{ object().type }} · v{{ object().version }} · {{ object().objectCategory }}</p>
        <div class="essay">{{ object().body || object().summary || 'No body yet.' }}</div>
        <section class="refs">
          <h3>References</h3>
          @if (userMessage(); as u) {
            <p><strong>You</strong> {{ u.createdAt }} — {{ u.content }}</p>
          }
          @if (assistantMessage(); as a) {
            <p><strong>Ideate</strong> {{ a.createdAt }} — {{ a.content }}</p>
          }
          @if (!object().sourceUserMessageId) {
            <p class="muted">Manual edit — no chat pair on this version.</p>
          }
          <mt-button size="sm" variant="outlined" [label]="'Open in Chat'" (clicked)="openChat.emit(object())" />
        </section>
        <p class="prov">generated_by: {{ object().generatedBy || 'user' }}</p>
      </article>
    </div>
  `,
  styles: `
    .page { display: grid; grid-template-columns: minmax(236px, 360px) 1fr; gap: 1rem; padding: 1rem; height: 100%; overflow: auto; align-items: start; }
    .body { overflow: auto; }
    .meta, .prov, .muted { color: var(--mt-text-muted); font-size: 0.85rem; }
    .essay { white-space: pre-wrap; line-height: 1.45; }
  `,
})
export class ObjectPageComponent {
  readonly object = input.required<IdeaObject>();
  readonly userMessage = input<TranscriptMessage | null>(null);
  readonly assistantMessage = input<TranscriptMessage | null>(null);
  readonly typeChange = output<string>();
  readonly newNode = output<IdeaObject>();
  readonly menu = output<IdeaObject>();
  readonly openChat = output<IdeaObject>();
  noop() {}
}
