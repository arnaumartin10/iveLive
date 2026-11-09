export type ParsedTicketmasterConcert = {
  eventId: string;
  eventName: string;
  artistName: string;
  lineup: string[];
  eventDate: string;
  venueName: string | null;
  city: string | null;
  country: string | null;
  ticketUrl: string | null;
};

export type TicketmasterAttraction = {
  id: string;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function normalizeConcertArtistName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getNestedName(value: unknown): string | null {
  return isRecord(value) ? stringValue(value.name) : null;
}

export function findExactTicketmasterAttraction(
  payload: unknown,
  artistName: string,
): TicketmasterAttraction | null {
  if (!isRecord(payload) || !isRecord(payload._embedded)) return null;
  const attractions = payload._embedded.attractions;
  if (!Array.isArray(attractions)) return null;
  const exactName = normalizeConcertArtistName(artistName);
  if (!exactName) return null;
  const match = attractions.find(
    (value) =>
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      normalizeConcertArtistName(value.name) === exactName,
  );
  return isRecord(match) &&
    typeof match.id === 'string' &&
    typeof match.name === 'string'
    ? { id: match.id, name: match.name }
    : null;
}

function safeHttpsUrl(value: unknown): string | null {
  const rawUrl = stringValue(value);
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseTicketmasterConcerts(
  payload: unknown,
  artistName: string,
  attractionId: string,
): ParsedTicketmasterConcert[] {
  if (!isRecord(payload) || !isRecord(payload._embedded)) return [];
  const events = payload._embedded.events;
  if (!Array.isArray(events)) return [];

  const results: ParsedTicketmasterConcert[] = [];
  const seenIds = new Set<string>();
  for (const rawEvent of events) {
    if (!isRecord(rawEvent)) continue;
    const eventId = stringValue(rawEvent.id);
    const eventName = stringValue(rawEvent.name);
    const embedded = isRecord(rawEvent._embedded) ? rawEvent._embedded : {};
    const attractions = Array.isArray(embedded.attractions)
      ? embedded.attractions.filter(isRecord)
      : [];
    const lineup = [
      ...new Set(
        attractions.flatMap((attraction) => {
          const name = stringValue(attraction.name);
          return name ? [name] : [];
        }),
      ),
    ];
    const hasSelectedAttraction = attractions.some(
      (attraction) => attraction.id === attractionId,
    );
    if (
      !eventId ||
      !eventName ||
      !hasSelectedAttraction ||
      seenIds.has(eventId)
    ) {
      continue;
    }

    const dates = isRecord(rawEvent.dates) ? rawEvent.dates : {};
    const start = isRecord(dates.start) ? dates.start : {};
    const eventDate =
      stringValue(start.localDate) ??
      stringValue(start.dateTime)?.slice(0, 10) ??
      null;
    if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) continue;

    const venue = Array.isArray(embedded.venues)
      ? embedded.venues.find(isRecord)
      : undefined;
    results.push({
      eventId,
      eventName,
      artistName,
      lineup: lineup.slice(0, 8),
      eventDate,
      venueName: venue ? stringValue(venue.name) : null,
      city: venue ? getNestedName(venue.city) : null,
      country: venue ? getNestedName(venue.country) : null,
      ticketUrl: safeHttpsUrl(rawEvent.url),
    });
    seenIds.add(eventId);
  }
  return results.sort((left, right) =>
    left.eventDate.localeCompare(right.eventDate),
  );
}
