import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Idea, Report } from '../ai/types';

export type StorageChoice = 'device' | 'server' | 'both';
export type User = { id: string; name: string; email: string; storage: StorageChoice };
export type Route = 'record' | 'ideas' | 'analyzed' | 'settings' | 'result';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

type State = {
  user: User | null;
  ideas: Idea[];
  route: Route;
  menuOpen: boolean;
  resultId: string | null;
  processing: string | null;
  setProcessing: (label: string | null) => void;
  openResult: (id: string) => void;
  setReport: (id: string, report: Report) => void;
  signIn: (name: string, email: string, storage: StorageChoice) => void;
  signOut: () => void;
  setStorage: (s: StorageChoice) => void;
  go: (r: Route) => void;
  setMenu: (open: boolean) => void;
  addIdea: (title: string, transcript: string) => string;
  appendToIdea: (id: string, text: string) => void;
  updateTranscript: (id: string, text: string) => void;
  removeIdea: (id: string) => void;
};

export const useApp = create<State>()(
  persist(
    (set) => ({
      user: null, ideas: [], route: 'record', menuOpen: false, resultId: null, processing: null,
      setProcessing: (processing) => set({ processing }),
      openResult: (id) => set({ resultId: id, route: 'result', menuOpen: false }),
      setReport: (id, report) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, report, title: report.title || i.title, reportFor: i.transcript, imagesChanged: false } : i) })),
      // TODO(backend): replace with real auth (handoff section 8). This only keeps a local profile.
      signIn: (name, email, storage) => set({ user: { id: uid(), name, email, storage }, route: 'record' }),
      signOut: () => set({ user: null, menuOpen: false, route: 'record' }),
      setStorage: (storage) => set((s) => (s.user ? { user: { ...s.user, storage } } : s)),
      go: (route) => set({ route, menuOpen: false }),
      setMenu: (menuOpen) => set({ menuOpen }),
      addIdea: (title, transcript) => {
        const now = new Date().toISOString(), id = uid();
        set((s) => ({ ideas: [{ id, createdAt: now, updatedAt: now, title, transcript, images: [], report: null, reportFor: '', imagesChanged: false }, ...s.ideas] }));
        return id;
      },
      appendToIdea: (id, text) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, transcript: (i.transcript + '\n\n' + text).trim(), updatedAt: new Date().toISOString() } : i) })),
      updateTranscript: (id, text) => set((s) => ({ ideas: s.ideas.map((i) => i.id === id ? { ...i, transcript: text, updatedAt: new Date().toISOString() } : i) })),
      removeIdea: (id) => set((s) => ({ ideas: s.ideas.filter((i) => i.id !== id) })),
    }),
    { name: 'idealizator-v1', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ user: s.user, ideas: s.ideas }) },
  ),
);
