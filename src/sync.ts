import { AppState } from 'react-native';
import { hasSession, syncRequest } from './api';
import { useApp } from './store';

let running = false, again = false;

/** Push what changed here, pull what changed elsewhere. Skipped when ideas are kept only on this iPhone. */
export async function syncNow(): Promise<void> {
  const { user } = useApp.getState();
  if (!user || user.storage === 'device' || !hasSession()) return;
  if (running) { again = true; return; }
  running = true;
  try {
    do {
      again = false;
      const s = useApp.getState();
      const startedAt = new Date().toISOString();
      const changed = s.ideas.filter((i) => i.updatedAt > s.lastPushAt);
      const res = await syncRequest(s.syncCursor, changed, s.tombstones);
      useApp.getState().applySync({ ideas: res.ideas, deleted: res.deleted, serverTime: res.serverTime, pushedIds: s.tombstones, startedAt });
    } while (again);
  } catch {
    // Offline or server down: everything stays queued (updatedAt and tombstones) and goes out on the next try.
  } finally { running = false; }
}

/** Sync on start, after edits (debounced) and when the app comes back to the foreground. */
export function startSync(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(syncNow, 2500); };
  const unsub = useApp.subscribe((s, prev) => {
    if (s.ideas !== prev.ideas || s.tombstones !== prev.tombstones || s.user?.id !== prev.user?.id || s.user?.storage !== prev.user?.storage) schedule();
  });
  const app = AppState.addEventListener('change', (st) => { if (st === 'active') syncNow(); });
  syncNow();
  return () => { clearTimeout(timer); unsub(); app.remove(); };
}
