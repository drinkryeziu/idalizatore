import { router } from 'expo-router';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Idea, Report } from '../ai/types';
import { persistStorage } from '../storage';

export type StorageChoice = 'device' | 'server' | 'both';
export type User = { id: string; name: string; email: string; storage: StorageChoice; verified: boolean };
export type Route = 'record' | 'ideas' | 'analyzed' | 'settings';
export const ROUTE_PATH: Record<Route, string> = { record: '/', ideas: '/ideas', analyzed: '/analyzed', settings: '/settings' };
export const routeFromPath = (p: string): Route | null => (Object.keys(ROUTE_PATH) as Route[]).find((r) => ROUTE_PATH[r] === p) ?? null;

let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** Messages that report a problem get the white-with-red-ring warning style. */
const WARN = /(couldn.t|didn.t|isn.t|declined|too many|not connected|unavailable|not allowed|reached|can.t)/i;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const stamp = () => new Date().toISOString();

type State = {
  user: User | null;
  ideas: Idea[];
  /** Account the ideas on this phone belong to; a different account signing in starts clean. */
  ideasOwner: string | null;
  /** Ideas deleted here that the server has not heard about yet. */
  tombstones: string[];
  syncCursor: string;
  lastPushAt: string;
  menuOpen: boolean;
  processing: string | null;
  /** True while the person has opened a password-reset link and must choose a new password. */
  recovery: boolean;
  /** The message at the bottom of the screen (auto-dismisses after about 4 seconds). */
  toast: { text: string; warn: boolean } | null;
  say: (text: string, warn?: boolean) => void;
  clearToast: () => void;
  /** "Where should this go?" sheet: shown when the AI is unsure which idea a recording belongs to. */
  choice: { text: string; title: string | null; candidates: string[] } | null;
  setChoice: (c: { text: string; title: string | null; candidates: string[] } | null) => void;
  /** The idea card that is open on Recorded Ideas, and the idea a new recording is being added to. */
  openId: string | null;
  setOpenId: (id: string | null) => void;
  target: string | null;
  setTarget: (id: string | null) => void;
  setRecovery: (v: boolean) => void;
  setProcessing: (label: string | null) => void;
  openResult: (id: string) => void;
  setReport: (id: string, report: Report) => void;
  setSession: (user: User) => void;
  patchUser: (patch: Partial<User>) => void;
  signedOut: () => void;
  wipeAll: () => void;
  go: (r: Route) => void;
  setMenu: (open: boolean) => void;
  addIdea: (title: string, transcript: string) => string;
  appendToIdea: (id: string, text: string) => void;
  updateTranscript: (id: string, text: string) => void;
  removeIdea: (id: string) => void;
  addImages: (id: string, images: Idea['images']) => void;
  removeImage: (id: string, imageId: string) => void;
  applySync: (p: { ideas: Idea[]; deleted: string[]; serverTime: string; pushedIds: string[]; startedAt: string }) => void;
};

export const useApp = create<State>()(
  persist(
    (set) => ({
      user: null, ideas: [], ideasOwner: null, tombstones: [], syncCursor: '', lastPushAt: '',
      menuOpen: false, processing: null, recovery: false, toast: null, choice: null, openId: null, target: null,
      say: (text, warn) => { clearTimeout(toastTimer); set({ toast: { text, warn: warn ?? WARN.test(text) } }); toastTimer = setTimeout(() => set({ toast: null }), 4200); },
      clearToast: () => { clearTimeout(toastTimer); set({ toast: null }); },
      setChoice: (choice) => set({ choice }),
      setOpenId: (openId) => set({ openId }),
      setTarget: (target) => set({ target }),
      setRecovery: (recovery) => set({ recovery }),
      setProcessing: (processing) => set({ processing }),
      openResult: (id) => { set({ menuOpen: false }); router.push(`/result/${id}` as any); },
      setReport: (id, report) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, report, title: report.title || i.title, reportFor: i.transcript, imagesChanged: false, updatedAt: stamp() } : i) })),
      setSession: (user) => set((s) => {
        const sameOwner = !s.ideasOwner || s.ideasOwner === user.id;
        return { user, ideasOwner: user.id, ideas: sameOwner ? s.ideas : [], tombstones: sameOwner ? s.tombstones : [], syncCursor: sameOwner ? s.syncCursor : '', lastPushAt: sameOwner ? s.lastPushAt : '' };
      }),
      patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      // Ideas kept only on the phone stay for the same account; synced ideas are cleared so they are not left on a shared phone.
      signedOut: () => set((s) => ({ user: null, menuOpen: false, processing: null,
        ...(s.user?.storage === 'device' ? {} : { ideas: [], ideasOwner: null, tombstones: [], syncCursor: '', lastPushAt: '' }) })),
      wipeAll: () => set({ user: null, ideas: [], ideasOwner: null, tombstones: [], syncCursor: '', lastPushAt: '', menuOpen: false, processing: null }),
      go: (route) => { set({ menuOpen: false }); router.navigate(ROUTE_PATH[route] as any); },
      setMenu: (menuOpen) => set({ menuOpen }),
      addIdea: (title, transcript) => {
        const now = stamp(), id = uid();
        set((s) => ({ ideas: [{ id, createdAt: now, updatedAt: now, title, transcript, images: [], report: null, reportFor: '', imagesChanged: false }, ...s.ideas] }));
        return id;
      },
      appendToIdea: (id, text) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, transcript: (i.transcript + '\n\n' + text).trim(), updatedAt: stamp() } : i) })),
      updateTranscript: (id, text) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, transcript: text, updatedAt: stamp() } : i) })),
      removeIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id), tombstones: s.tombstones.includes(id) ? s.tombstones : [...s.tombstones, id] })),
      // Images count as a change to the idea: the report becomes stale (imagesChanged) until it is analyzed again.
      addImages: (id, images) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, images: [...i.images, ...images], imagesChanged: true, updatedAt: stamp() } : i) })),
      removeImage: (id, imageId) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, images: i.images.filter((m) => m.id !== imageId), imagesChanged: true, updatedAt: stamp() } : i) })),
      // Merge the server's answer: last write wins per idea (by updatedAt); local images are kept because they are not synced yet.
      applySync: ({ ideas: remote, deleted, serverTime, pushedIds, startedAt }) => set((s) => {
        let list = s.ideas.filter((i) => !deleted.includes(i.id));
        let changed = list.length !== s.ideas.length;
        for (const r of remote) {
          const k = list.findIndex((i) => i.id === r.id);
          if (k < 0) { if (!s.tombstones.includes(r.id)) { list = [...list, { ...r, images: [] }]; changed = true; } }
          else if (r.updatedAt > list[k].updatedAt) { list[k] = { ...r, images: list[k].images }; changed = true; }
        }
        const tombstones = s.tombstones.filter((t) => !pushedIds.includes(t));
        // Keep the same array when nothing changed, so the sync listener does not fire again and loop.
        if (changed) list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return { ideas: changed ? list : s.ideas, tombstones: tombstones.length === s.tombstones.length ? s.tombstones : tombstones, syncCursor: serverTime, lastPushAt: startedAt };
      }),
    }),
    {
      name: 'idealizator-v1', storage: createJSONStorage(() => persistStorage),
      partialize: (s) => ({ user: s.user, ideas: s.ideas, ideasOwner: s.ideasOwner, tombstones: s.tombstones, syncCursor: s.syncCursor, lastPushAt: s.lastPushAt }),
    },
  ),
);
