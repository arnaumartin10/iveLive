export type SavePosterResult = 'saved' | 'denied' | 'unavailable';

export async function savePosterToPhotos(
  _uri: string,
): Promise<SavePosterResult> {
  return 'unavailable';
}
