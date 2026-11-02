import { describe, expect, it } from '@jest/globals';
import { savePosterToPhotos } from '../src/features/cloud/savePosterToPhotos.web';

describe('web poster saving', () => {
  it('reports Photos saving as unavailable without native media-library access', async () => {
    await expect(savePosterToPhotos('file:///atlas.png')).resolves.toBe(
      'unavailable',
    );
  });
});
