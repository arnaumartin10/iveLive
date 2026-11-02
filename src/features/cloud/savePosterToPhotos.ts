import { Asset, requestPermissionsAsync } from 'expo-media-library';

export type SavePosterResult = 'saved' | 'denied' | 'unavailable';

export async function savePosterToPhotos(
  uri: string,
): Promise<SavePosterResult> {
  const permission = await requestPermissionsAsync(true);
  if (permission.status !== 'granted') return 'denied';
  await Asset.create(uri);
  return 'saved';
}
