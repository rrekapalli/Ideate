import { Injectable, inject } from '@angular/core';
import { MtConfirm, type MtConfirmRequest } from '../toast/mt-toast.service';

export interface MtDialogData {
  header?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class MtDialog {
  private readonly confirm = inject(MtConfirm);

  open(data: MtDialogData): { closed: Promise<boolean> } {
    const req: MtConfirmRequest = {
      header: data.header,
      message: data.message,
      acceptLabel: data.acceptLabel,
      rejectLabel: data.rejectLabel,
    };
    return { closed: this.confirm.open(req) };
  }
}
