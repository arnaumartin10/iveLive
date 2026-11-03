import { VENUE_TYPES, type VenueType } from '../venues/venueTypes';
import type {
  CloudArtistData,
  CloudCoattendanceLink,
  CloudLogTuple,
  UserCloudData,
} from './types';
import type { ConcertWithRelations } from '../concerts/types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeVenueType(value: unknown): VenueType | null {
  if (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(VENUE_TYPES, value)
  ) {
    return value as VenueType;
  }
  return null;
}

function normalizeLogs(value: unknown): CloudLogTuple[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CloudLogTuple[] => {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') return [];
    const venueType = normalizeVenueType(entry[1]);
    if (!venueType) return [];
    const rating = numberOrNull(entry[2]);
    return [[entry[0], venueType, rating]];
  });
}

function normalizeVenueCounts(
  value: unknown,
): CloudArtistData['venue_type_counts'] {
  if (!isRecord(value)) return {};
  const counts: Partial<Record<VenueType, number>> = {};
  for (const [venue, count] of Object.entries(value)) {
    const venueType = normalizeVenueType(venue);
    if (venueType && typeof count === 'number' && Number.isFinite(count)) {
      counts[venueType] = count;
    }
  }
  return counts;
}

export function normalizeCloudArtists(
  value: unknown,
  concerts: readonly ConcertWithRelations[] = [],
): CloudArtistData[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CloudArtistData[] => {
    if (!isRecord(entry)) return [];
    const id = stringOrNull(entry.id);
    const name = stringOrNull(entry.name);
    if (!id || !name) return [];

    const logs = Array.isArray(entry.logs)
      ? normalizeLogs(entry.logs)
      : concerts
          .filter((concert) => concert.artist_id === id)
          .flatMap((concert): CloudLogTuple[] => {
            const venueType = normalizeVenueType(concert.venue_type);
            return venueType
              ? [[concert.event_date, venueType, concert.rating]]
              : [];
          });
    const macroGenres = stringArray(entry.macro_genres);
    const genres = stringArray(entry.genres);
    const primaryMacro = stringOrNull(entry.primary_macro);

    return [
      {
        id,
        name,
        image_url_thumb: stringOrNull(entry.image_url_thumb),
        image_url_large: stringOrNull(entry.image_url_large),
        primary_macro: primaryMacro,
        macro_genres: macroGenres,
        sub_genres: stringArray(entry.sub_genres),
        genres,
        begin_year: numberOrNull(entry.begin_year),
        log_count: numberOrNull(entry.log_count) ?? logs.length,
        avg_rating: numberOrNull(entry.avg_rating),
        max_rating: numberOrNull(entry.max_rating),
        first_seen: stringOrNull(entry.first_seen),
        last_seen: stringOrNull(entry.last_seen),
        venue_type_counts: normalizeVenueCounts(entry.venue_type_counts),
        logs,
      },
    ];
  });
}

export function normalizeCloudLinks(value: unknown): CloudCoattendanceLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): CloudCoattendanceLink[] => {
    if (!isRecord(entry)) return [];
    const sourceId = stringOrNull(entry.source_id);
    const targetId = stringOrNull(entry.target_id);
    if (!sourceId || !targetId) return [];
    return [
      {
        source_id: sourceId,
        target_id: targetId,
        weight: numberOrNull(entry.weight) ?? 0,
        shared_dates: stringArray(entry.shared_dates),
        venue_names: stringArray(entry.venue_names),
      },
    ];
  });
}

export function normalizeUserCloudData(value: unknown): UserCloudData | null {
  if (!isRecord(value)) return null;
  return {
    artists: normalizeCloudArtists(value.artists),
    links: normalizeCloudLinks(value.links),
  };
}
