import { beforeEach, describe, expect, it } from '@jest/globals';
import type { ArtistRow } from '../src/features/artists/types';
import { logConcertSchema } from '../src/features/concerts/schemas';
import { useLogDraft } from '../src/features/log/store';

const artist: ArtistRow = {
  id: 'artist-1',
  spotify_id: 'spotify-1',
  name: 'Test Artist',
  name_normalized: 'test artist',
  image_url_large: null,
  image_url_thumb: null,
  genres: [],
  macro_genres: [],
  primary_macro: null,
  is_on_tour: false,
  public_avg_rating: null,
  public_rating_count: 0,
  public_weighted_rating: null,
  tour_end_date: null,
  tour_last_checked_at: null,
  tour_start_date: null,
  popularity: null,
  source: 'spotify',
  created_by: null,
  last_synced_at: null,
  created_at: '2025-01-01T00:00:00.000Z',
  bio: null,
  bio_source: null,
  bio_url: null,
  bio_lang: null,
  bio_attribution: null,
  group_image_url: null,
  banner_image_url: null,
  musicbrainz_id: null,
  wikidata_id: null,
  wikipedia_title: null,
  lastfm_tags: [],
  enrichment_status: 'pending',
  enrichment_error: null,
  enriched_at: null,
  last_enrichment_requested_at: null,
  user_edited_fields: [],
  begin_year: null,
  begin_year_source: null,
};

describe('log draft wizard', () => {
  beforeEach(() => {
    useLogDraft.getState().reset();
  });

  it('requires artist, valid date, venue type, and a half-step rating', () => {
    const draft = useLogDraft.getState();

    expect(draft.isStepValid(1)).toBe(false);
    expect(draft.isStepValid(2)).toBe(true);
    expect(draft.isStepValid(3)).toBe(false);
    expect(draft.isStepValid(4)).toBe(false);
    expect(draft.isStepValid(5)).toBe(false);

    draft.setEventDate(new Date('2099-06-14T12:00:00.000Z'));
    expect(draft.isStepValid(2)).toBe(false);
    draft.setArtist(artist);
    draft.setEventDate(new Date('2025-06-14T12:00:00.000Z'));
    draft.setVenueType('festival');
    draft.setRating(4.3);
    expect(draft.isStepValid(1)).toBe(true);
    expect(draft.isStepValid(3)).toBe(true);
    expect(draft.isStepValid(4)).toBe(true);
    expect(draft.isStepValid(5)).toBe(false);

    draft.setRating(4.5);
    expect(draft.isStepValid(5)).toBe(true);
  });

  it('preserves all show details when moving backward and forward', () => {
    const draft = useLogDraft.getState();
    const eventDate = new Date('2025-06-14T12:00:00.000Z');
    draft.setArtist(artist);
    draft.setEventDate(eventDate);
    draft.setVenueType('festival');
    draft.setVenueName('Stage 3 at Mad Cool');
    draft.setRating(4.5);
    draft.setReview('The closing song was unforgettable.');
    draft.setStep(3);

    draft.goNext();
    expect(useLogDraft.getState().step).toBe(4);
    draft.goNext();
    expect(useLogDraft.getState().step).toBe(5);
    draft.goBack();
    expect(useLogDraft.getState().step).toBe(4);

    const restoredDraft = useLogDraft.getState();
    expect(restoredDraft.artist).toEqual(artist);
    expect(restoredDraft.eventDate).toEqual(eventDate);
    expect(restoredDraft.venueType).toBe('festival');
    expect(restoredDraft.venueName).toBe('Stage 3 at Mad Cool');
    expect(restoredDraft.rating).toBe(4.5);
    expect(restoredDraft.review).toBe('The closing song was unforgettable.');
  });
});

describe('concert log schema', () => {
  const validLog = {
    artist_id: '00000000-0000-4000-8000-000000000001',
    artist_name: 'Test Artist',
    spotify_artist_id: 'spotify-1',
    venue_type: 'festival',
    venue_name: 'Main stage',
    concert_date: '2025-06-14',
    notes: 'A great night.',
    rating: 4.5,
  };

  it('accepts DB-compatible venue and half-step rating values', () => {
    expect(logConcertSchema.parse(validLog)).toMatchObject({
      venue_type: 'festival',
      rating: 4.5,
    });
  });

  it('rejects future dates, invalid venue enums, and non half-step ratings', () => {
    expect(() =>
      logConcertSchema.parse({ ...validLog, concert_date: '2099-01-01' }),
    ).toThrow();
    expect(() =>
      logConcertSchema.parse({ ...validLog, venue_type: 'club' }),
    ).toThrow();
    expect(() =>
      logConcertSchema.parse({ ...validLog, rating: 4.3 }),
    ).toThrow();
    expect(() =>
      logConcertSchema.parse({ ...validLog, rating: 5.5 }),
    ).toThrow();
  });
});
