import type { HomeArtist } from './types';

export function selectTrendingDisplay(
  mode: string,
  primary: HomeArtist[],
  appTrending: HomeArtist[],
): { artists: HomeArtist[]; source: 'primary' | 'app' } {
  if (mode === 'app') {
    return { artists: appTrending, source: 'app' };
  }
  return { artists: primary, source: 'primary' };
}
