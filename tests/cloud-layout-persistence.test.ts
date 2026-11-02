import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildCloudNodes,
  persistCloudPositions,
  restoreCloudPositions,
  type CloudNode,
} from '../src/features/cloud/simulation';
import type { UserArtistSummary } from '../src/features/concerts/types';

jest.mock('../src/features/cloud/api', () => ({
  fetchCloudLayout: async () => null,
  saveCloudLayout: async () => undefined,
}));

const artist = {
  id: 'layout-artist',
  name: 'Layout Artist',
  name_normalized: 'layout artist',
  spotify_id: null,
  image_url_large: null,
  image_url_thumb: null,
  genres: ['indie rock'],
  macro_genres: ['indie'],
  primary_macro: 'indie',
  popularity: null,
  source: 'manual',
  created_by: null,
  last_synced_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  log_count: 1,
  avg_rating: 4,
  max_rating: 4,
  first_seen: '2024-01-01',
  last_seen: '2024-01-01',
} as unknown as UserArtistSummary;

describe('Cloud layout persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('restores valid per-user positions and skips nodes added after the saved layout', async () => {
    const nodes = buildCloudNodes([artist], 'genre').nodes;
    const artistNode = nodes.find((node) => node.type === 'artist');
    if (!artistNode) throw new Error('Artist node was not created');
    artistNode.x = 143;
    artistNode.y = -62;
    await persistCloudPositions('user-a', 'genre', nodes);

    artistNode.x = 0;
    artistNode.y = 0;
    const addedNode = { ...artistNode, id: 'new-artist' } as CloudNode;
    expect(
      await restoreCloudPositions('user-a', 'genre', [...nodes, addedNode]),
    ).toBe(true);
    expect(artistNode).toMatchObject({ x: 143, y: -62 });
    expect(addedNode.x).not.toBe(143);
  });

  it('does not apply an unsupported saved layout version', async () => {
    await AsyncStorage.setItem(
      '@ivelive/cloud-layout:user-a:genre',
      JSON.stringify({
        version: 99,
        positions: { 'layout-artist': { x: 10, y: 20 } },
      }),
    );
    const nodes = buildCloudNodes([artist], 'genre').nodes;
    const artistNode = nodes.find((node) => node.type === 'artist');
    if (!artistNode) throw new Error('Artist node was not created');

    expect(await restoreCloudPositions('user-a', 'genre', nodes)).toBe(false);
    expect(artistNode.x).not.toBe(10);
  });
});
