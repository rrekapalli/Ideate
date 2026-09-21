import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type MtToastSeverity = 'success' | 'info' | 'warn' | 'error';

export interface MtToastMessage {
  id: number;
  severity: MtToastSeverity;
  summary?: string;
  detail?: string;
  life?: number;
}

@Injectable({ providedIn: 'root' })
export class MtToast {
  private readonly messagesSubject = new Subject<MtToastMessage>();
  private readonly clearSubject = new Subject<void>();
  private seq = 0;

  readonly messages$ = this.messagesSubject.asObservable();
  readonly clear$ = this.clearSubject.asObservable();

  show(msg: Omit<MtToastMessage, 'id'>): void {
    this.messagesSubject.next({ ...msg, id: ++this.seq, life: msg.life ?? 4000 });
  }

  success(summary: string, detail?: string): void {
    this.show({ severity: 'success', summary, detail });
  }

  info(summary: string, detail?: string): void {
    this.show({ severity: 'info', summary, detail });
  }

  warn(summary: string, detail?: string): void {
    this.show({ severity: 'warn', summary, detail });
  }

  error(summary: string, detail?: string): void {
    this.show({ severity: 'error', summary, detail });
  }

  clear(): void {
    this.clearSubject.next();
  }
}

@Injectable({ providedIn: 'root' })
export class MtConfirm {
  /** Simple confirm via window.confirm until dedicated dialog host is mounted. */
  ask(message: string, header = 'Confirm'): boolean {
    return typeof window !== 'undefined' ? window.confirm(`${header}\n\n${message}`) : false;
  }

  /** Convenience: confirm then run action. */
  confirm(opts: { message: string; header?: string; accept: () => void; reject?: () => void }): void {
    if (this.ask(opts.message, opts.header ?? 'Confirm')) {
      opts.accept();
    } else {
      opts.reject?.();
    }
  }
}
