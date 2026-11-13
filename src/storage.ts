import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { del, get, set } from 'idb-keyval';

// Native: AsyncStorage. Web: IndexedDB, because localStorage (about 5 MB) is too small once ideas carry attached images.
const web = {
  getItem: async (k: string) => { try { return (await get<string>(k)) ?? null; } catch { return null; } },
  setItem: async (k: string, v: string) => { try { await set(k, v); } catch { /* private mode: the app still works for this session */ } },
  removeItem: async (k: string) => { try { await del(k); } catch {} },
};
export const persistStorage = Platform.OS === 'web' ? web : AsyncStorage;
