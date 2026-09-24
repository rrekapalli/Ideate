import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subscription, fromEvent, interval, timer } from 'rxjs';
import {
  APP_SW_UNRECOVERABLE_GUARD_KEY,
  clearServiceWorkerActivationGuard,
  clearServiceWorkerCaches,
  clearServiceWorkerRecoveryGuards,
  consumeOneTimeServiceWorkerRecoveryGuard,
  getWaitingServiceWorkerRegistration,
  requestServiceWorkerUpdate,
  unregisterStaleServiceWorkers,
} from './service-worker.util';

const UPDATE_POLL_MS = 15 * 60 * 1000;
const SW_ARM_RETRY_MS = 500;
const SW_ARM_MAX_ATTEMPTS = 60;
const DOWNLOAD_BANNER_MS = 12_000;
const DOWNLOAD_WATCH_POLL_MS = 2_000;
const DOWNLOAD_WATCH_MAX_POLLS = 30;
const UPDATE_DISMISSED_HASH_KEY = 'ideate-app-update-dismissed-hash';

export type AppUpdatePhase = 'idle' | 'checking' | 'downloading' | 'ready' | 'applying';

@Injectable({ providedIn: 'root' })
export class AppUpdateService implements OnDestroy {
  private readonly swUpdate = inject(SwUpdate);
  private subs = new Subscription();
  private swArmed = false;
  private applying = false;
  private downloadWatchSub: Subscription | null = null;
  private downloadBannerSub: Subscription | null = null;
  private latestReadyHash: string | null = null;

  readonly updateReady = signal(false);
  readonly updatePhase = signal<AppUpdatePhase>('idle');
  readonly downloadBannerVisible = signal(false);

  start(): void {
    this.resetIdlePhase();
    void this.bootstrapServiceWorkerUpdate();
    this.waitForSwAndArm();
  }

  ngOnDestroy(): void {
    this.clearDownloadWatch();
    this.clearDownloadBannerTimer();
    this.subs.unsubscribe();
  }

  showDownloadBanner(): boolean {
    return this.downloadBannerVisible() && this.updatePhase() === 'downloading';
  }

  showUpdateReadyBanner(): boolean {
    return this.updateReady() && !this.applying;
  }

  async checkNow(): Promise<void> {
    if (!this.swUpdate.isEnabled || this.applying) {
      return;
    }

    if (this.updatePhase() === 'idle') {
      this.updatePhase.set('checking');
    }

    try {
      const found = await this.swUpdate.checkForUpdate();
      if (found) {
        if (this.updatePhase() === 'checking') {
          this.beginDownloading();
        }
        return;
      }
    } catch {
      /* offline or SW not ready */
    }

    if (this.updatePhase() === 'checking') {
      this.resetIdlePhase();
    }
  }

  applyUpdate(force = false): void {
    if (this.applying) {
      return;
    }
    if (!force && this.isUpdateDismissed()) {
      this.updateReady.set(true);
      this.updatePhase.set('ready');
      return;
    }

    this.applying = true;
    this.clearDownloadWatch();
    this.clearDownloadBannerTimer();
    this.updatePhase.set('applying');
    this.downloadBannerVisible.set(false);

    if (!this.swUpdate.isEnabled) {
      globalThis.location.reload();
      return;
    }

    void this.swUpdate
      .activateUpdate()
      .then(() => {
        globalThis.location.reload();
      })
      .catch(() => {
        this.applying = false;
        this.resetIdlePhase();
      });
  }

  dismiss(): void {
    this.updateReady.set(false);
    if (this.latestReadyHash) {
      this.setDismissedHash(this.latestReadyHash);
    }
    if (this.updatePhase() === 'ready') {
      this.resetIdlePhase();
    }
  }

  private async bootstrapServiceWorkerUpdate(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    await unregisterStaleServiceWorkers();
    await requestServiceWorkerUpdate();
    await this.markUpdateReadyIfWaiting();
  }

  private waitForSwAndArm(): void {
    let attempts = 0;
    const sub = timer(0, SW_ARM_RETRY_MS).subscribe(() => {
      attempts += 1;
      if (this.swArmed) {
        sub.unsubscribe();
        return;
      }
      if (!this.swUpdate.isEnabled) {
        if (attempts >= SW_ARM_MAX_ATTEMPTS) {
          sub.unsubscribe();
        }
        return;
      }
      this.swArmed = true;
      sub.unsubscribe();
      this.attachVersionListener();
      this.scheduleChecks();
      this.subs.add(timer(10_000).subscribe(() => clearServiceWorkerRecoveryGuards()));
    });
    this.subs.add(sub);
  }

  private attachVersionListener(): void {
    this.subs.add(
      this.swUpdate.versionUpdates.subscribe((evt: VersionEvent) => {
        if (evt.type === 'VERSION_DETECTED') {
          this.beginDownloading();
          return;
        }
        if (evt.type === 'VERSION_READY') {
          this.latestReadyHash = evt.latestVersion?.hash ?? null;
          this.markUpdateReady();
          return;
        }
        if (evt.type === 'NO_NEW_VERSION_DETECTED') {
          if (this.updatePhase() === 'checking') {
            this.resetIdlePhase();
          }
        }
      })
    );

    this.subs.add(
      this.swUpdate.unrecoverable.subscribe(() => {
        void this.recoverUnrecoverableState();
      })
    );
  }

  private async recoverUnrecoverableState(): Promise<void> {
    if (!consumeOneTimeServiceWorkerRecoveryGuard(APP_SW_UNRECOVERABLE_GUARD_KEY)) {
      this.markUpdateReady();
      return;
    }

    await clearServiceWorkerCaches();
    globalThis.location.reload();
  }

  private markUpdateReady(): void {
    if (this.isUpdateDismissed()) {
      return;
    }
    this.updateReady.set(true);
    this.updatePhase.set('ready');
  }

  private beginDownloading(): void {
    if (this.applying) {
      return;
    }
    this.updatePhase.set('downloading');
    this.downloadBannerVisible.set(true);
    this.clearDownloadBannerTimer();
    this.downloadBannerSub = timer(DOWNLOAD_BANNER_MS).subscribe(() => {
      this.downloadBannerVisible.set(false);
    });
    this.subs.add(this.downloadBannerSub);
    this.armDownloadWatch();
  }

  private armDownloadWatch(): void {
    this.clearDownloadWatch();
    let polls = 0;
    this.downloadWatchSub = timer(0, DOWNLOAD_WATCH_POLL_MS).subscribe(() => {
      polls += 1;
      void this.markUpdateReadyIfWaiting();
      if (this.updateReady() || polls >= DOWNLOAD_WATCH_MAX_POLLS) {
        this.clearDownloadWatch();
        if (polls >= DOWNLOAD_WATCH_MAX_POLLS && this.updatePhase() === 'downloading') {
          this.resetIdlePhase();
        }
      }
    });
    this.subs.add(this.downloadWatchSub);
  }

  private async markUpdateReadyIfWaiting(): Promise<void> {
    if (this.applying || this.updateReady()) {
      return;
    }
    const waiting = await getWaitingServiceWorkerRegistration();
    if (!waiting) {
      return;
    }
    this.latestReadyHash = waiting.waiting?.scriptURL ?? this.latestReadyHash;
    this.markUpdateReady();
  }

  private resetIdlePhase(): void {
    this.updateReady.set(false);
    this.updatePhase.set('idle');
    this.downloadBannerVisible.set(false);
    this.clearDownloadWatch();
    this.clearDownloadBannerTimer();
    clearServiceWorkerActivationGuard();
  }

  private clearDownloadWatch(): void {
    this.downloadWatchSub?.unsubscribe();
    this.downloadWatchSub = null;
  }

  private clearDownloadBannerTimer(): void {
    this.downloadBannerSub?.unsubscribe();
    this.downloadBannerSub = null;
  }

  private scheduleChecks(): void {
    void this.checkNow();
    this.subs.add(timer(2_000).subscribe(() => void this.checkNow()));
    this.subs.add(timer(6_000).subscribe(() => void this.checkNow()));
    this.subs.add(interval(UPDATE_POLL_MS).subscribe(() => void this.checkNow()));

    if (typeof document !== 'undefined') {
      this.subs.add(
        fromEvent(document, 'visibilitychange').subscribe(() => {
          if (document.visibilityState !== 'visible') {
            return;
          }
          void this.bootstrapServiceWorkerUpdate();
          void this.checkNow();
        })
      );
    }

    if (typeof window !== 'undefined') {
      this.subs.add(
        fromEvent(window, 'focus').subscribe(() => {
          void this.checkNow();
        })
      );

      this.subs.add(
        fromEvent(window, 'pageshow').subscribe(() => {
          void this.bootstrapServiceWorkerUpdate();
          void this.checkNow();
        })
      );
    }
  }

  private isUpdateDismissed(): boolean {
    if (!this.latestReadyHash) {
      return false;
    }
    try {
      return sessionStorage.getItem(UPDATE_DISMISSED_HASH_KEY) === this.latestReadyHash;
    } catch {
      return false;
    }
  }

  private setDismissedHash(hash: string): void {
    try {
      sessionStorage.setItem(UPDATE_DISMISSED_HASH_KEY, hash);
    } catch {
      /* private browsing */
    }
  }
}
