export const VENUE_TYPES = [
  'festival',
  'concert_hall_club',
  'stadium',
  'indoor_arena',
  'festa_major',
  'other',
] as const;

export type VenueType = (typeof VENUE_TYPES)[number];

export interface ExternalVenue {
  external_id: string;
  name: string;
  venue_type: VenueType;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  source: 'musicbrainz';
}

type MusicBrainzPlace = {
  id?: string;
  name?: string;
  type?: string | null;
  area?: { name?: string } | string | null;
  address?: string | null;
  coordinates?: { latitude?: number; longitude?: number } | null;
};

type MusicBrainzEvent = {
  id?: string;
  name?: string;
  type?: string | null;
  'life-span'?: { begin?: string | null };
  relations?: Array<{
    place?: { name?: string; area?: { name?: string } | string | null };
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isVenueType(value: unknown): value is VenueType {
  return (
    typeof value === 'string' &&
    (VENUE_TYPES as readonly string[]).includes(value)
  );
}

function areaName(area: MusicBrainzPlace['area']): string | null {
  if (typeof area === 'string') return area || null;
  return area?.name?.trim() || null;
}

function placeType(type: string | null | undefined): VenueType {
  const normalized = type?.toLowerCase();
  if (normalized === 'stadium') return 'stadium';
  if (
    normalized === 'arena' ||
    normalized === 'indoor arena' ||
    normalized === 'outdoor arena'
  ) {
    return 'indoor_arena';
  }
  if (normalized === 'venue') return 'concert_hall_club';
  return 'other';
}

export function parseMusicBrainzPlaces(payload: unknown): ExternalVenue[] {
  if (!isRecord(payload) || !Array.isArray(payload.places)) return [];
  return payload.places.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string') return [];
    if (typeof entry.name !== 'string' || entry.name.trim().length === 0) {
      return [];
    }
    const coordinates = isRecord(entry.coordinates) ? entry.coordinates : null;
    const place = entry as MusicBrainzPlace;
    return [
      {
        external_id: entry.id,
        name: entry.name.trim(),
        venue_type: placeType(place.type),
        city: areaName(place.area),
        country: null,
        lat:
          typeof coordinates?.latitude === 'number'
            ? coordinates.latitude
            : null,
        lng:
          typeof coordinates?.longitude === 'number'
            ? coordinates.longitude
            : null,
        source: 'musicbrainz' as const,
      },
    ];
  });
}

export function parseMusicBrainzEvents(payload: unknown): ExternalVenue[] {
  if (!isRecord(payload) || !Array.isArray(payload.events)) return [];
  return payload.events.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.name !== 'string' ||
      entry.name.trim().length === 0
    ) {
      return [];
    }
    const event = entry as MusicBrainzEvent;
    const place = event.relations?.find((relation) => relation.place)?.place;
    return [
      {
        external_id: entry.id,
        name: entry.name.trim(),
        venue_type: 'festival' as const,
        city: areaName(place?.area) ?? place?.name ?? null,
        country: null,
        lat: null,
        lng: null,
        source: 'musicbrainz' as const,
      },
    ];
  });
}

export function musicBrainzSearchUrl(query: string, type: VenueType): string {
  const field = type === 'festival' ? 'event' : 'place';
  const endpoint = type === 'festival' ? 'event' : 'place';
  const params = new URLSearchParams({
    query: `${field}:"${query.replace(/["\\]/g, ' ')}"`,
    fmt: 'json',
    limit: '8',
  });
  return `https://musicbrainz.org/ws/2/${endpoint}/?${params}`;
}
