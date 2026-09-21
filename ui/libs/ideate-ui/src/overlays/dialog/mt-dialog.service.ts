import { Injectable } from '@angular/core';

export interface MtDialogData {
  header?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
}

/** Lightweight confirm/dialog via window until CDK Dialog is lazy-wired (W4). */
@Injectable({ providedIn: 'root' })
export class MtDialog {
  open(data: MtDialogData): { closed: Promise<boolean> } {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(`${data.header ? data.header + '\n\n' : ''}${data.message}`)
        : false;
    return { closed: Promise.resolve(ok) };
  }
}
