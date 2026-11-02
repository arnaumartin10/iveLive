import { create } from 'zustand';
import type { ArtistRow } from '../artists/types';
import type { VenueType } from '../venues/venueTypes';
import type { ConcertWithRelations } from '../concerts/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface LogDraftState {
  /** Step 1 */
  artist: ArtistRow | null;
  /** Step 2 */
  eventDate: Date;
  /** Step 3 */
  venueType: VenueType | null;
  /** Step 4 */
  venueName: string;
  /** Step 5 */
  rating: number | null;
  review: string;
  /** Navigator */
  step: WizardStep;
  /** Edit mode */
  isEditing: boolean;
  editingConcertId: string | null;
}

export interface LogDraftActions {
  reset: () => void;
  setArtist: (artist: ArtistRow | null) => void;
  setEventDate: (date: Date) => void;
  setVenueType: (venueType: VenueType | null) => void;
  setVenueName: (venueName: string) => void;
  setRating: (rating: number | null) => void;
  setReview: (review: string) => void;
  setStep: (step: WizardStep) => void;
  goNext: () => void;
  goBack: () => void;
  startEdit: (concert: ConcertWithRelations) => void;
  isStepValid: (step: WizardStep) => boolean;
  /** True when any meaningful field has been filled (used for discard guard) */
  hasProgress: () => boolean;
}

export type LogDraftStore = LogDraftState & LogDraftActions;

// ─── Initial state ────────────────────────────────────────────────────────────

function initialState(): LogDraftState {
  return {
    artist: null,
    eventDate: new Date(),
    venueType: null,
    venueName: '',
    rating: null,
    review: '',
    step: 1,
    isEditing: false,
    editingConcertId: null,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useLogDraft = create<LogDraftStore>((set, get) => ({
  ...initialState(),

  reset() {
    set(initialState());
  },

  setArtist(artist) {
    set({ artist });
  },

  setEventDate(eventDate) {
    set({ eventDate });
  },

  setVenueType(venueType) {
    set({ venueType });
  },

  setVenueName(venueName) {
    set({ venueName });
  },

  setRating(rating) {
    set({ rating });
  },

  setReview(review) {
    set({ review });
  },

  setStep(step) {
    set({ step });
  },

  goNext() {
    const { step } = get();
    if (step < 6) set({ step: (step + 1) as WizardStep });
  },

  goBack() {
    const { step, isEditing } = get();
    // Artist is locked in edit mode; cannot go below step 2
    if (isEditing && step <= 2) return;
    if (step > 1) set({ step: (step - 1) as WizardStep });
  },

  startEdit(concert) {
    let dateObj = new Date();
    try {
      dateObj = new Date(`${concert.event_date}T12:00:00`);
    } catch {
      // fallback
    }

    set({
      artist: concert.artist,
      eventDate: dateObj,
      venueType: concert.venue_type,
      venueName: concert.venue_name || '',
      rating: concert.rating,
      review: concert.review || '',
      step: 2,
      isEditing: true,
      editingConcertId: concert.id,
    });
  },

  isStepValid(step) {
    const state = get();
    switch (step) {
      case 1:
        return state.artist !== null;
      case 2:
        return state.eventDate <= new Date();
      case 3:
        return state.venueType !== null;
      case 4:
        return state.venueType !== null;
      case 5: {
        const rating = state.rating;
        return (
          state.artist !== null &&
          state.eventDate <= new Date() &&
          state.venueType !== null &&
          rating !== null &&
          rating >= 0.5 &&
          rating <= 5 &&
          Number.isInteger(rating * 2)
        );
      }
      case 6:
        return true;
      default:
        return false;
    }
  },

  hasProgress() {
    const { artist, venueType, venueName, review, rating, step } = get();
    return (
      artist !== null ||
      venueType !== null ||
      venueName.trim().length > 0 ||
      review.trim().length > 0 ||
      rating !== null ||
      step > 1
    );
  },
}));
