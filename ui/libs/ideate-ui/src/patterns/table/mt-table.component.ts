import { ChangeDetectionStrategy, Component, TemplateRef, contentChild, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'mt-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div class="mt-table-wrap">
      <table class="mt-table">
        <thead>
          <tr>
            @for (col of columns(); track col.field) {
              <th [style.width]="col.width || null">{{ col.header }}</th>
            }
            @if (actions()) {
              <th class="mt-table__actions">Actions</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of value(); track trackRow($index, row)) {
            <tr>
              @for (col of columns(); track col.field) {
                <td>{{ cell(row, col.field) }}</td>
              }
              @if (actionsTpl(); as tpl) {
                <td class="mt-table__actions">
                  <ng-container *ngTemplateOutlet="tpl; context: { $implicit: row }" />
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="columns().length + (actions() ? 1 : 0)" class="mt-table__empty">
                {{ emptyMessage() }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .mt-table-wrap {
        width: 100%;
        overflow: auto;
        border: 1px solid var(--mt-surface-border, #e5e7eb);
        border-radius: var(--mt-corner-radius, 1px);
      }
      .mt-table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--mt-fs, 0.8125rem);
      }
      .mt-table th,
      .mt-table td {
        padding: 0.22rem 0.4rem;
        text-align: left;
        border-bottom: 1px solid var(--mt-surface-border, #e5e7eb);
        vertical-align: middle;
        white-space: nowrap;
      }
      .mt-table th {
        background: color-mix(in srgb, var(--mt-surface-ground, #f4f4f5) 80%, var(--mt-surface-card));
        font-weight: 600;
        color: var(--mt-text, #212121);
        white-space: nowrap;
      }
      .mt-table tr:hover td {
        background: color-mix(in srgb, var(--mt-primary, #10b981) 6%, var(--mt-surface-card));
      }
      .mt-table__empty {
        text-align: center;
        color: var(--mt-text-muted);
        padding: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MtTableComponent {
  readonly columns = input<{ field: string; header: string; width?: string }[]>([]);
  readonly value = input<Record<string, unknown>[]>([]);
  readonly emptyMessage = input('No records');
  readonly actions = input(false);
  readonly dataKey = input<string | undefined>(undefined);

  readonly actionsTpl = contentChild<TemplateRef<{ $implicit: Record<string, unknown> }>>('actions');

  cell(row: Record<string, unknown>, field: string): unknown {
    return row?.[field];
  }

  trackRow(index: number, row: Record<string, unknown>): string | number {
    const key = this.dataKey();
    if (key && row?.[key] != null) {
      return String(row[key]);
    }
    return index;
  }
}
