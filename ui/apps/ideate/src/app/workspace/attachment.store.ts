import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Attachment, IdeateApi } from '@ideate/api-client';

@Injectable({ providedIn: 'root' })
export class AttachmentStore {
  private readonly api = inject(IdeateApi);
  readonly items = signal<Attachment[]>([]);
  readonly workspaceId = signal('');

  load(workspaceId: string) {
    this.workspaceId.set(workspaceId);
    this.api.listAttachments(workspaceId).subscribe({
      next: (rows) => this.items.set(rows ?? []),
      error: () => this.items.set([]),
    });
  }

  clear() {
    this.workspaceId.set('');
    this.items.set([]);
  }

  forObject(objectId: string): Attachment[] {
    return this.items().filter((a) => a.objectId === objectId);
  }

  forMessage(messageId: string): Attachment[] {
    return this.items().filter((a) => a.messageId === messageId);
  }

  upload(file: File, objectId?: string): Observable<Attachment> {
    return this.api.uploadAttachment(this.workspaceId(), file, objectId).pipe(
      tap((row) => this.items.update((list) => [...list.filter((a) => a.id !== row.id), row])),
    );
  }

  remove(id: string): Observable<unknown> {
    return this.api.deleteAttachment(this.workspaceId(), id).pipe(
      tap(() => this.items.update((list) => list.filter((a) => a.id !== id))),
    );
  }

  content(id: string) {
    return this.api.attachmentContent(this.workspaceId(), id);
  }
}
