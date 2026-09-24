export const APP_SW_ACTIVATION_GUARD_KEY = 'ideate-app-sw-activation-guard';
export const APP_SW_RELOAD_GUARD_KEY = 'ideate-app-sw-reload-guard';
export const APP_SW_CACHE_RECOVERY_GUARD_KEY = 'ideate-app-sw-cache-recovery-guard';
export const APP_SW_UNRECOVERABLE_GUARD_KEY = 'ideate-app-sw-unrecoverable-guard';
export const APP_SW_EXPECTED_SCRIPT = 'ngsw-worker.js';

const ACTIVATION_GUARD_MAX = 3;
const ACTIVATION_GUARD_WINDOW_MS = 120_000;

type ActivationGuard = { url?: string; count?: number; ts?: number };

function readActivationGuard(): ActivationGuard | null {
  try {
    const raw = sessionStorage.getItem(APP_SW_ACTIVATION_GUARD_KEY);
    return raw ? (JSON.parse(raw) as ActivationGuard) : null;
  } catch {
    return null;
  }
}

function writeActivationGuard(value: ActivationGuard): void {
  try {
    sessionStorage.setItem(APP_SW_ACTIVATION_GUARD_KEY, JSON.stringify(value));
  } catch {
    /* private browsing */
  }
}

export function canActivateWaitingWorker(scriptUrl: string): boolean {
  const guard = readActivationGuard();
  const now = Date.now();
  if (!guard || guard.url !== scriptUrl || now - (guard.ts ?? 0) > ACTIVATION_GUARD_WINDOW_MS) {
    return true;
  }
  return (guard.count ?? 0) < ACTIVATION_GUARD_MAX;
}

export function recordWaitingWorkerActivation(scriptUrl: string): void {
  const now = Date.now();
  const guard = readActivationGuard();
  let count = 1;
  if (guard && guard.url === scriptUrl && now - (guard.ts ?? 0) <= ACTIVATION_GUARD_WINDOW_MS) {
    count = (guard.count ?? 0) + 1;
  }
  writeActivationGuard({ url: scriptUrl, count, ts: now });
}

export function clearServiceWorkerActivationGuard(): void {
  try {
    sessionStorage.removeItem(APP_SW_ACTIVATION_GUARD_KEY);
    sessionStorage.removeItem(APP_SW_RELOAD_GUARD_KEY);
    sessionStorage.removeItem(APP_SW_CACHE_RECOVERY_GUARD_KEY);
    sessionStorage.removeItem(APP_SW_UNRECOVERABLE_GUARD_KEY);
  } catch {
    /* private browsing */
  }
}

export async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof caches === 'undefined') {
    return;
  }
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

export function consumeOneTimeServiceWorkerRecoveryGuard(
  guardKey: string = APP_SW_CACHE_RECOVERY_GUARD_KEY
): boolean {
  try {
    if (sessionStorage.getItem(guardKey) === '1') {
      return false;
    }
    sessionStorage.setItem(guardKey, '1');
    return true;
  } catch {
    return true;
  }
}

export function clearServiceWorkerRecoveryGuards(): void {
  try {
    sessionStorage.removeItem(APP_SW_CACHE_RECOVERY_GUARD_KEY);
    sessionStorage.removeItem(APP_SW_UNRECOVERABLE_GUARD_KEY);
  } catch {
    /* private browsing */
  }
}

export function skipWaitingServiceWorker(
  worker: ServiceWorker,
  onActivating?: () => void
): boolean {
  if (!canActivateWaitingWorker(worker.scriptURL)) {
    return false;
  }
  recordWaitingWorkerActivation(worker.scriptURL);
  onActivating?.();
  worker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function getWaitingServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  const reg = await getServiceWorkerRegistration();
  return reg?.waiting ? reg : null;
}

export async function requestServiceWorkerUpdate(): Promise<ServiceWorkerRegistration | null> {
  const reg = await getServiceWorkerRegistration();
  if (!reg) {
    return null;
  }
  try {
    await reg.update();
  } catch {
    /* offline or throttled */
  }
  return reg;
}

export async function activateWaitingServiceWorkerIfAny(
  onActivating?: () => void
): Promise<boolean> {
  const reg = await getServiceWorkerRegistration();
  if (!reg?.waiting) {
    return false;
  }
  return skipWaitingServiceWorker(reg.waiting, onActivating);
}

export async function unregisterStaleServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (reg) => {
      const scriptUrl =
        reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? reg.active?.scriptURL ?? '';
      if (scriptUrl && !scriptUrl.includes(APP_SW_EXPECTED_SCRIPT)) {
        await reg.unregister();
      }
    })
  );
}
