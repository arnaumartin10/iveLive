export type LastFmChartArtist = {
  name: string;
  mbid: string | null;
};

export function parseLastFmArtistChart(
  payload: unknown,
): LastFmChartArtist[] | null {
  if (typeof payload !== 'object' || payload === null || 'error' in payload) {
    return null;
  }

  const chart =
    'topartists' in payload && typeof payload.topartists === 'object'
      ? payload.topartists
      : 'artists' in payload && typeof payload.artists === 'object'
        ? payload.artists
        : null;
  const entries =
    chart && 'artist' in chart && Array.isArray(chart.artist)
      ? chart.artist
      : null;
  if (!entries) return null;

  return entries.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null || !('name' in entry)) {
      return [];
    }
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    if (!name) return [];
    const mbid =
      typeof entry.mbid === 'string' && entry.mbid.trim()
        ? entry.mbid.trim()
        : null;
    return [{ name, mbid }];
  });
}
