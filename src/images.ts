// Image attachments (handoff open decision 6): up to 4 per idea, each shrunk to 1600 px on the long edge as JPEG (quality 0.7),
// stored on the iPhone in the app's documents folder. They are sent to the AI when you analyze, but not synced to the server yet.
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { copyAsync, deleteAsync, documentDirectory, getInfoAsync, makeDirectoryAsync, readAsStringAsync } from 'expo-file-system/legacy';
import type { Idea } from './ai/types';

export const MAX_IMAGES = 4;
const DIR = 'idea-images/';
const EDGE = 1600;

/** Image.uri is stored relative to the documents folder, because the absolute path can change when the app updates. */
export const imageUri = (rel: string) => (/^(file:|http|data:|blob:)/.test(rel) ? rel : (documentDirectory ?? '') + rel);

async function store(asset: ImagePicker.ImagePickerAsset): Promise<Idea['images'][number]> {
  const long = Math.max(asset.width || 0, asset.height || 0);
  const resize = long > EDGE ? [asset.width >= asset.height ? { resize: { width: EDGE } } : { resize: { height: EDGE } }] : [];
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  if (Platform.OS === 'web') {
    // No app folder in a browser: keep the shrunken image inline as a data URI (the web store is IndexedDB, so size is fine).
    const out = await manipulateAsync(asset.uri, resize, { compress: 0.7, format: SaveFormat.JPEG, base64: true });
    return { id, uri: `data:image/jpeg;base64,${out.base64}`, createdAt: new Date().toISOString() };
  }
  const out = await manipulateAsync(asset.uri, resize, { compress: 0.7, format: SaveFormat.JPEG });
  await makeDirectoryAsync((documentDirectory ?? '') + DIR, { intermediates: true }).catch(() => {});
  const rel = `${DIR}${id}.jpg`;
  await copyAsync({ from: out.uri, to: (documentDirectory ?? '') + rel });
  await deleteAsync(out.uri, { idempotent: true }).catch(() => {});
  return { id, uri: rel, createdAt: new Date().toISOString() };
}

export type ImportResult = { images: Idea['images']; error?: string };

/** Pick from the photo library or take a photo. `room` is how many more images this idea can take. */
export async function importImages(source: 'library' | 'camera', room: number): Promise<ImportResult> {
  if (Platform.OS === 'web') source = 'library'; // browsers offer the camera inside their own picker
  if (room <= 0) return { images: [], error: `You can attach up to ${MAX_IMAGES} images to an idea.` };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { images: [], error: 'Camera access is off. Turn it on in Settings, or choose from your photos.' };
  }
  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 1 });
  if (res.canceled) return { images: [] };
  const images: Idea['images'] = [];
  for (const a of res.assets.slice(0, room)) {
    try { images.push(await store(a)); } catch { /* skip one bad file, keep the rest */ }
  }
  return { images, error: images.length < Math.min(res.assets.length, room) ? 'Some images could not be added.' : undefined };
}

export async function deleteImageFiles(images: Idea['images']) {
  if (Platform.OS === 'web') return; // inline data URIs go with the idea
  await Promise.all(images.map((i) => deleteAsync(imageUri(i.uri), { idempotent: true }).catch(() => {})));
}
export async function deleteAllImageFiles() {
  if (Platform.OS === 'web') return;
  await deleteAsync((documentDirectory ?? '') + DIR, { idempotent: true }).catch(() => {});
}

/** Base64 payloads for /analyze. Files are already small, so four fit well within the server's request limit. */
export async function imagePayloads(images: Idea['images']): Promise<{ mediaType: string; data: string }[]> {
  const out: { mediaType: string; data: string }[] = [];
  if (Platform.OS === 'web') return images.slice(0, MAX_IMAGES).filter((i) => i.uri.startsWith('data:')).map((i) => ({ mediaType: 'image/jpeg', data: i.uri.split(',')[1] ?? '' }));
  for (const i of images.slice(0, MAX_IMAGES)) {
    const uri = imageUri(i.uri);
    if (!(await getInfoAsync(uri)).exists) continue;
    out.push({ mediaType: 'image/jpeg', data: await readAsStringAsync(uri, { encoding: 'base64' }) });
  }
  return out;
}
