import type { ArtistImageGalleryRow, ArtistRow } from './types';

export type ArtistImageRole = 'profile' | 'banner';

export type ArtistImageChoice = {
  label: string;
  uri: string;
};

export function getArtistImageChoices(
  artist: Pick<
    ArtistRow,
    | 'image_url_large'
    | 'image_url_thumb'
    | 'group_image_url'
    | 'banner_image_url'
  >,
  role: ArtistImageRole,
  galleryImages: ArtistImageGalleryRow[] = [],
): ArtistImageChoice[] {
  const candidates: (readonly [string, string | null])[] =
    role === 'banner'
      ? [
          ['Wide banner', artist.banner_image_url],
          ['Group photo', artist.group_image_url],
          ['Artist portrait', artist.image_url_large],
          ['Square portrait', artist.image_url_thumb],
        ]
      : [
          ['Artist portrait', artist.image_url_large],
          ['Square portrait', artist.image_url_thumb],
          ['Group photo', artist.group_image_url],
          ['Wide banner', artist.banner_image_url],
        ];
  const sourceCandidates = [
    ...candidates,
    ...galleryImages
      .filter((image) => image.image_role === role)
      .map((image) => {
        const source =
          image.source === 'theaudiodb' ? 'TheAudioDB' : image.source;
        return [`${image.label} · ${source}`, image.image_url] as const;
      }),
  ];
  const seen = new Set<string>();
  return sourceCandidates.flatMap(([label, uri]) => {
    if (!uri || seen.has(uri)) return [];
    seen.add(uri);
    return [{ label, uri }];
  });
}
