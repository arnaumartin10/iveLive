import { beforeEach, describe, expect, it } from '@jest/globals';
import { useLogDraft } from '../src/features/log/store';
import type { ConcertWithRelations } from '../src/features/concerts/types';

const mockConcert: ConcertWithRelations = {
  id: 'concert-123',
  user_id: 'user-456',
  artist_id: 'artist-789',
  event_date: '2026-05-18',
  venue_type: 'stadium',
  venue_name: 'Estadi Olímpic',
  rating: 4.5,
  review: 'Unbelievable production and sound quality.',
  created_at: '2026-05-18T23:00:00Z',
  updated_at: '2026-05-18T23:00:00Z',
  artist: {
    id: 'artist-789',
    spotify_id: 'spotify-789',
    name: 'Coldplay',
    name_normalized: 'coldplay',
    image_url_large: 'https://example.com/coldplay-large.jpg',
    image_url_thumb: 'https://example.com/coldplay-thumb.jpg',
    genres: ['pop', 'rock'],
    macro_genres: ['pop'],
    primary_macro: 'pop',
    is_on_tour: false,
    public_avg_rating: null,
    public_rating_count: 0,
    public_weighted_rating: null,
    tour_end_date: null,
    tour_last_checked_at: null,
    tour_start_date: null,
    popularity: 92,
    source: 'spotify',
    created_by: null,
    last_synced_at: null,
    created_at: '2025-01-01T00:00:00Z',
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
    begin_year: 1996,
    begin_year_source: 'spotify',
  },
};

describe('Edit Log Flow', () => {
  beforeEach(() => {
    useLogDraft.getState().reset();
  });

  it('initializes edit mode with steps 2 to 5 pre-filled and artist locked', () => {
    const draft = useLogDraft.getState();
    draft.startEdit(mockConcert);

    const state = useLogDraft.getState();
    expect(state.isEditing).toBe(true);
    expect(state.editingConcertId).toBe('concert-123');

    // Artist locked
    expect(state.artist).toEqual(mockConcert.artist);

    // Starts on step 2 (Date)
    expect(state.step).toBe(2);

    // Steps 2-5 pre-filled
    expect(state.venueType).toBe('stadium');
    expect(state.venueName).toBe('Estadi Olímpic');
    expect(state.rating).toBe(4.5);
    expect(state.review).toBe('Unbelievable production and sound quality.');

    // Event date is correctly parsed
    expect(state.eventDate.getFullYear()).toBe(2026);
    expect(state.eventDate.getMonth()).toBe(4); // May (0-indexed)
    expect(state.eventDate.getDate()).toBe(18);
  });

  it('locks artist by preventing goBack from navigating below step 2', () => {
    const draft = useLogDraft.getState();
    draft.startEdit(mockConcert);

    expect(useLogDraft.getState().step).toBe(2);

    // Attempting to go back from step 2 in edit mode must do nothing (artist is locked)
    draft.goBack();
    expect(useLogDraft.getState().step).toBe(2);

    // Advancing through steps 3, 4, 5
    draft.goNext();
    expect(useLogDraft.getState().step).toBe(3);
    draft.goNext();
    expect(useLogDraft.getState().step).toBe(4);
    draft.goNext();
    expect(useLogDraft.getState().step).toBe(5);

    // Navigating back returns to 4, 3, 2 and stops at 2
    draft.goBack();
    expect(useLogDraft.getState().step).toBe(4);
    draft.goBack();
    expect(useLogDraft.getState().step).toBe(3);
    draft.goBack();
    expect(useLogDraft.getState().step).toBe(2);
    draft.goBack();
    expect(useLogDraft.getState().step).toBe(2);
  });

  it('validates pre-filled and updated fields in edit mode', () => {
    const draft = useLogDraft.getState();
    draft.startEdit(mockConcert);

    // All steps are already valid because pre-filled
    expect(useLogDraft.getState().isStepValid(1)).toBe(true);
    expect(useLogDraft.getState().isStepValid(2)).toBe(true);
    expect(useLogDraft.getState().isStepValid(3)).toBe(true);
    expect(useLogDraft.getState().isStepValid(4)).toBe(true);
    expect(useLogDraft.getState().isStepValid(5)).toBe(true);

    // Changing rating to an invalid step (e.g. 4.3 non-half-step) invalidates step 5
    draft.setRating(4.3);
    expect(useLogDraft.getState().isStepValid(5)).toBe(false);

    // Setting valid rating restores validity
    draft.setRating(5.0);
    expect(useLogDraft.getState().isStepValid(5)).toBe(true);
  });
});
