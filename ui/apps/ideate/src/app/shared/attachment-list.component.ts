import { Component, DestroyRef, ElementRef, OnDestroy, ViewChild, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ATTACHMENT_ACCEPT, Attachment } from '@ideate/api-client';
import { MtButtonComponent, MtIconComponent } from '@ideate/ui';
import { AttachmentStore } from '../workspace/attachment.store';

@Component({
  selector: 'ideate-attachment-list',
  imports: [MtButtonComponent, MtIconComponent],
  template: `
    <div class="wrap" [class.compact]="compact()" (click)="$event.stopPropagation()">
      @if (items().length === 0 && !canAdd()) {
        <p class="empty">No attachments.</p>
      }
      <ul>
        @for (item of items(); track item.id) {
          <li>
            @if (previewOf(item.id); as src) {
              <img [src]="src" alt="" />
            } @else {
              <mt-icon [name]="iconFor(item)" [size]="16" />
            }
            <button type="button" class="name" (click)="open(item)" [title]="item.originalName">
              {{ item.originalName }}
              <span class="size">{{ sizeLabel(item.byteSize) }}</span>
            </button>
            @if (canRemove()) {
              <mt-button size="sm" variant="icon" icon="close" ariaLabel="Remove attachment" (clicked)="remove.emit(item)" />
            }
          </li>
        }
      </ul>
      @if (canAdd()) {
        <input
          #picker
          type="file"
          hidden
          multiple
          [attr.accept]="accept"
          (change)="onPick($event)"
        />
        <mt-button size="sm" variant="outlined" icon="attach_file" label="Attach" (clicked)="picker.click()" />
      }
    </div>
  `,
  styles: `
    .wrap { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
    li {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
      padding: 0.2rem 0.25rem;
      border: 1px solid var(--mt-surface-border, #e5e7eb);
      background: color-mix(in srgb, var(--mt-text) 4%, transparent);
    }
    img { width: 1.6rem; height: 1.6rem; object-fit: cover; flex: 0 0 auto; }
    .name {
      flex: 1 1 auto;
      min-width: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.78rem;
      text-align: left;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .size { display: block; font-size: 0.68rem; color: var(--mt-text-muted); }
    .empty { margin: 0; font-size: 0.78rem; color: var(--mt-text-muted); }
    .compact ul { display: flex; flex-wrap: wrap; flex-direction: row; }
    .compact li { max-width: 100%; }
    .compact .size { display: none; }
  `,
})
export class AttachmentListComponent implements OnDestroy {
  private readonly store = inject(AttachmentStore);
  private readonly destroyRef = inject(DestroyRef);
  readonly items = input<Attachment[]>([]);
  readonly compact = input(false);
  readonly canAdd = input(false);
  readonly canRemove = input(true);
  readonly addFiles = output<File[]>();
  readonly remove = output<Attachment>();
  readonly accept = ATTACHMENT_ACCEPT;
  @ViewChild('picker') picker?: ElementRef<HTMLInputElement>;
  private objectUrls = new Map<string, string>();
  readonly previews = signal<Record<string, string>>({});

  constructor() {
    effect(() => {
      for (const item of this.items()) {
        if ((item.contentType || '').startsWith('image/') && !this.objectUrls.has(item.id)) {
          this.loadPreview(item);
        }
      }
    });
  }

  ngOnDestroy() {
    this.revokeAll();
  }

  previewOf(id: string): string | undefined {
    return this.previews()[id];
  }

  iconFor(item: Attachment): string {
    if ((item.contentType || '').includes('pdf') || item.originalName.toLowerCase().endsWith('.pdf')) {
      return 'description';
    }
    return 'description';
  }

  sizeLabel(bytes: number): string {
    if (bytes < 1024) {
      return bytes + ' B';
    }
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  open(item: Attachment) {
    this.store.content(item.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  onPick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length) {
      this.addFiles.emit(files);
    }
  }

  private loadPreview(item: Attachment) {
    if (this.objectUrls.has(item.id)) {
      return;
    }
    this.objectUrls.set(item.id, '');
    this.store.content(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.objectUrls.set(item.id, url);
        this.previews.update((map) => ({ ...map, [item.id]: url }));
      },
    });
  }

  private revokeAll() {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
  }
}
