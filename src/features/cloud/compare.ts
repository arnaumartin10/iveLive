import type { CloudArtistData } from './types';
import { fetchUserCloudData } from './api';
import { fetchCommonArtists } from '../social/api';

export const COMPARE_ATLAS_ENABLED =
  process.env.EXPO_PUBLIC_COMPARE_ATLAS === 'true';

export type CompareArtist = Pick<
  CloudArtistData,
  'id' | 'name' | 'primary_macro' | 'macro_genres'
> & {
  side: 'friend' | 'shared';
  dashedInk: true;
};

export type CompareAtlas = {
  friendId: string;
  friendArtists: CloudArtistData[];
  commonArtistIds: string[];
  tasteOverlapPercent: number;
  territoriesOnlyYou: string[];
  territoriesOnlyFriend: string[];
};

export function buildCompareAtlas(input: {
  friendId: string;
  yourArtists: CloudArtistData[];
  friendArtists: CloudArtistData[];
  commonArtistIds: string[];
}): CompareAtlas {
  const ownIds = new Set(input.yourArtists.map(({ id }) => id));
  const friendIds = new Set(input.friendArtists.map(({ id }) => id));
  const commonIds = [...new Set(input.commonArtistIds)].filter(
    (id) => ownIds.has(id) && friendIds.has(id),
  );
  const unionSize = new Set([...ownIds, ...friendIds]).size;
  const ownTerritories = new Set(
    input.yourArtists.flatMap((artist) => artist.macro_genres),
  );
  const friendTerritories = new Set(
    input.friendArtists.flatMap((artist) => artist.macro_genres),
  );
  return {
    friendId: input.friendId,
    friendArtists: input.friendArtists,
    commonArtistIds: commonIds,
    tasteOverlapPercent: unionSize
      ? Math.round((commonIds.length / unionSize) * 100)
      : 0,
    territoriesOnlyYou: [...ownTerritories]
      .filter((slug) => !friendTerritories.has(slug))
      .sort(),
    territoriesOnlyFriend: [...friendTerritories]
      .filter((slug) => !ownTerritories.has(slug))
      .sort(),
  };
}

export function compareFeatureAvailable(): boolean {
  return COMPARE_ATLAS_ENABLED;
}

export async function loadCompareAtlasWhenEnabled<T>(
  enabled: boolean,
  load: () => Promise<T>,
): Promise<T | null> {
  if (!enabled) return null;
  return load();
}

export async function fetchCompareAtlas(
  yourUserId: string,
  friendId: string,
  yourArtists: CloudArtistData[],
): Promise<CompareAtlas> {
  const [friendCloud, commonArtists] = await Promise.all([
    fetchUserCloudData(friendId),
    fetchCommonArtists(yourUserId, friendId),
  ]);
  return buildCompareAtlas({
    friendId,
    yourArtists,
    friendArtists: friendCloud.artists,
    commonArtistIds: commonArtists.map(({ artist_id }) => artist_id),
  });
}
