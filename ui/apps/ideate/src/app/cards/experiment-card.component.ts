import { Component, input, output } from '@angular/core';
import { IdeaObject } from '@ideate/api-client';
import { ObjectCardChromeComponent } from './object-card-chrome.component';

@Component({
  selector: 'ideate-experiment-card',
  imports: [ObjectCardChromeComponent],
  template: `
    <ideate-object-card-chrome
      [object]="object()"
      (open)="open.emit($event)"
      (typeChange)="typeChange.emit($event)"
      (newNode)="newNode.emit($event)"
      (menu)="menu.emit($event)"
      (openChat)="openChat.emit($event)"
    />
  `,
})
export class ExperimentCardComponent {
  readonly object = input.required<IdeaObject>();
  readonly open = output<IdeaObject>();
  readonly typeChange = output<string>();
  readonly newNode = output<IdeaObject>();
  readonly menu = output<IdeaObject>();
  readonly openChat = output<IdeaObject>();
}
