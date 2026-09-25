import { readResume, resumeStorageKey, writeResume } from './workspace-resume';

describe('workspace-resume', () => {
  it('round-trips the last focused card and message', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    } as Storage;
    writeResume(storage, 'ws1', 'obj9', 'msg2');
    expect(store.get(resumeStorageKey('ws1'))).toContain('obj9');
    expect(readResume(storage, 'ws1')).toEqual({ objectId: 'obj9', messageId: 'msg2' });
    expect(readResume(storage, 'missing')).toBeNull();
  });
});
