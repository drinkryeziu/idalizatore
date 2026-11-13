import { Platform } from 'react-native';
import { readAsStringAsync } from 'expo-file-system/legacy';

/** Base64 of a finished recording. Web recordings are WebM blobs; iPhone recordings are m4a files. */
export async function readAudio(uri: string): Promise<{ base64: string; mimeType: string }> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    return { base64: dataUrl.split(',')[1] ?? '', mimeType: (blob.type || 'audio/webm').split(';')[0] };
  }
  return { base64: await readAsStringAsync(uri, { encoding: 'base64' }), mimeType: 'audio/m4a' };
}
