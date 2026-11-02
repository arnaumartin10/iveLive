export interface ArtistDTO {
  spotifyId: string;
  name: string;
  imageLarge: string | null;
  imageThumb: string | null;
  genres: string[];
  popularity: number | null;
}

type SpotifyImage = {
  url: string;
  width: number | null;
  height: number | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function toImages(value: unknown): SpotifyImage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const image = asRecord(item);
    if (typeof image.url !== 'string' || image.url.length === 0) return [];
    return [
      {
        url: image.url,
        width: typeof image.width === 'number' ? image.width : null,
        height: typeof image.height === 'number' ? image.height : null,
      },
    ];
  });
}

export function toArtistDTO(spotifyArtist: unknown): ArtistDTO {
  const artist = asRecord(spotifyArtist);
  const images = toImages(artist.images);
  const largest = [...images].sort(
    (left, right) =>
      (right.width ?? right.height ?? 0) - (left.width ?? left.height ?? 0),
  )[0];
  const thumbnail = [...images].sort(
    (left, right) =>
      Math.abs((left.width ?? left.height ?? 160) - 160) -
      Math.abs((right.width ?? right.height ?? 160) - 160),
  )[0];

  return {
    spotifyId: typeof artist.id === 'string' ? artist.id : '',
    name: typeof artist.name === 'string' ? artist.name : 'Unknown artist',
    imageLarge: largest?.url ?? null,
    imageThumb: thumbnail?.url ?? null,
    genres: [],
    popularity: null,
  };
}
