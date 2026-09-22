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

export interface MtConfirmRequest {
  header?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MtConfirm {
  private readonly requestSubject = new Subject<MtConfirmRequest | null>();
  readonly request$ = this.requestSubject.asObservable();
  private pending: ((ok: boolean) => void) | null = null;

  ask(message: string, header = 'Confirm'): Promise<boolean> {
    return this.open({ message, header });
  }

  open(data: MtConfirmRequest): Promise<boolean> {
    this.settle(false);
    this.requestSubject.next({
      header: data.header ?? 'Confirm',
      message: data.message,
      acceptLabel: data.acceptLabel ?? 'OK',
      rejectLabel: data.rejectLabel ?? 'Cancel',
      danger: data.danger ?? false,
    });
    return new Promise((resolve) => {
      this.pending = resolve;
    });
  }

  /** Convenience: confirm then run action. */
  confirm(opts: {
    message: string;
    header?: string;
    acceptLabel?: string;
    rejectLabel?: string;
    danger?: boolean;
    accept: () => void;
    reject?: () => void;
  }): void {
    void this.open(opts).then((ok) => {
      if (ok) opts.accept();
      else opts.reject?.();
    });
  }

  settle(ok: boolean): void {
    this.requestSubject.next(null);
    const resolve = this.pending;
    this.pending = null;
    resolve?.(ok);
  }
}
