const nonArtistMarkers = [
  'tribute',
  'cover',
  'experience',
  'in concert',
  'symphonic',
];

export function normalizeTourName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function isLikelyTributeEvent(
  eventName: string,
  attractionNames: string[],
  artistName: string,
): boolean {
  const searchableText = normalizeTourName(
    [eventName, ...attractionNames].join(' '),
  );
  const normalizedArtistName = normalizeTourName(artistName);

  return nonArtistMarkers.some((marker) => {
    const pattern = new RegExp(
      `(^|\\s)${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`,
    );
    return pattern.test(searchableText) && !pattern.test(normalizedArtistName);
  });
}

export function parseTicketmasterStatus(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  const statuses: Record<string, string> = {
    onsale: 'on_sale',
    offsale: 'off_sale',
    cancelled: 'cancelled',
    postponed: 'postponed',
    rescheduled: 'rescheduled',
  };
  return statuses[value.toLowerCase()] ?? 'unknown';
}

export function parseTicketmasterCoordinates(
  value: unknown,
): { latitude: number; longitude: number } | null {
  if (typeof value !== 'object' || value === null) return null;
  const location = value as Record<string, unknown>;
  const parseCoordinate = (coordinate: unknown): number | null => {
    if (
      typeof coordinate !== 'number' &&
      (typeof coordinate !== 'string' || !coordinate.trim())
    ) {
      return null;
    }
    const parsed =
      typeof coordinate === 'number' ? coordinate : Number(coordinate);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const latitude = parseCoordinate(location.latitude);
  const longitude = parseCoordinate(location.longitude);
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

export function parseTicketmasterStart(
  start: Record<string, unknown>,
): { timestamp: number; eventDate: string } | null {
  const dateTime =
    typeof start.dateTime === 'string' && start.dateTime.trim()
      ? start.dateTime.trim()
      : null;
  const localDate =
    typeof start.localDate === 'string' && start.localDate.trim()
      ? start.localDate.trim()
      : null;
  const localTime =
    typeof start.localTime === 'string' && start.localTime.trim()
      ? start.localTime.trim()
      : '00:00:00';
  const rawStart =
    dateTime ?? (localDate ? `${localDate}T${localTime}Z` : null);
  if (!rawStart) return null;

  const timestamp = Date.parse(rawStart);
  if (!Number.isFinite(timestamp)) return null;
  const eventDate = localDate ?? new Date(timestamp).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return null;
  return { timestamp, eventDate };
}
