import type { WishlistDraft, WishlistItem } from '../profile/types';

export type OfficialConcertSearchResult = {
  eventId: string;
  eventName: string;
  artistName: string;
  artistId: string;
  lineup: string[];
  eventDate: string;
  venueName: string | null;
  city: string | null;
  country: string | null;
  ticketUrl: string | null;
};

export function concertDateRangeError(
  dateFrom: string,
  dateTo: string,
  today = new Date().toISOString().slice(0, 10),
) {
  const isValidDate = (value: string) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  };
  if (!isValidDate(dateFrom) || !isValidDate(dateTo)) {
    return 'Enter dates in YYYY-MM-DD format.';
  }
  if (dateFrom && dateFrom < today) {
    return 'Start date must be today or later.';
  }
  if (dateTo && dateTo < today) {
    return 'End date must be today or later.';
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return 'End date must be on or after the start date.';
  }
  return null;
}

export function normalizeConcertMatch(value: string | null | undefined) {
  return (
    value
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase() ?? ''
  );
}

export function findWishlistConcert(
  concert: OfficialConcertSearchResult,
  wishlist: WishlistItem[],
) {
  return (
    wishlist.find((item) => {
      return (
        item.artist_id === concert.artistId &&
        item.target_date === concert.eventDate &&
        normalizeConcertMatch(item.venue_name) ===
          normalizeConcertMatch(concert.venueName)
      );
    }) ?? null
  );
}

export function concertWishlistDraft(
  concert: OfficialConcertSearchResult,
  artistId: string,
): WishlistDraft {
  return {
    artist_id: artistId,
    event_name: concert.eventName.slice(0, 120),
    venue_name: concert.venueName?.slice(0, 120) ?? '',
    city: concert.city?.slice(0, 100) ?? '',
    target_date: concert.eventDate,
    date_flexible: false,
    venue_type: null,
    priority: 2,
    note: '',
    status: 'wanted',
    ticket_url: concert.ticketUrl,
  };
}
