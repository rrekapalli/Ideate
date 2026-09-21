import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IdeaObject } from '@ideate/api-client';

@Injectable({ providedIn: 'root' })
export class DiagramCanvasBridge {
  readonly open$ = new Subject<IdeaObject>();
  readonly typeChange$ = new Subject<{ object: IdeaObject; type: string }>();
  readonly newNode$ = new Subject<IdeaObject>();
  readonly menu$ = new Subject<IdeaObject>();
  readonly openChat$ = new Subject<IdeaObject>();
}
