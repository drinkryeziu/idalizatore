import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// The session (access + refresh token) lives in the iOS Keychain. SecureStore values are limited to about 2 KB,
// so the session JSON is stored in chunks.
const CHUNK = 1800;
const secure = {
  async getItem(key: string) {
    try {
      const n = Number(await SecureStore.getItemAsync(`${key}.n`));
      if (!n) return null;
      const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
      return parts.some((p) => p === null) ? null : parts.join('');
    } catch { return null; }
  },
  async setItem(key: string, value: string) {
    try {
      const old = Number(await SecureStore.getItemAsync(`${key}.n`)) || 0;
      const parts = value.match(new RegExp(`.{1,${CHUNK}}`, 'gs')) ?? [];
      await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
      await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
      for (let i = parts.length; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    } catch {}
  },
  async removeItem(key: string) {
    try {
      const n = Number(await SecureStore.getItemAsync(`${key}.n`)) || 0;
      for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
      await SecureStore.deleteItemAsync(`${key}.n`);
    } catch {}
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ejzzeuhhkmuooswabwzm.supabase.co',
  process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_B3xhqWT7WC8kqbupjML_cw_rSfE0sjN',
  { auth: { storage: secure, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);
