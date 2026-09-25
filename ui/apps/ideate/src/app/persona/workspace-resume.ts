export interface WorkspaceResume {
  objectId: string;
  messageId?: string | null;
}

export function resumeStorageKey(workspaceId: string): string {
  return `ideate.resume.${workspaceId}`;
}

export function readResume(storage: Storage, workspaceId: string): WorkspaceResume | null {
  try {
    const raw = storage.getItem(resumeStorageKey(workspaceId));
    if (!raw) {
      return null;
    }
    const v = JSON.parse(raw) as WorkspaceResume;
    if (!v || typeof v.objectId !== 'string' || !v.objectId) {
      return null;
    }
    return {
      objectId: v.objectId,
      messageId: typeof v.messageId === 'string' ? v.messageId : null,
    };
  } catch {
    return null;
  }
}

export function writeResume(
  storage: Storage,
  workspaceId: string,
  objectId: string,
  messageId?: string | null,
): void {
  if (!workspaceId || !objectId) {
    return;
  }
  try {
    storage.setItem(resumeStorageKey(workspaceId), JSON.stringify({ objectId, messageId: messageId ?? null }));
  } catch {
    /* ignore quota */
  }
}
