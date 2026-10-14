import { create } from 'zustand';
import type { SpotifyArtistSearchResult } from '../spotify/types';

export type LogWizardStep = 'artist' | 'details' | 'memories' | 'success';

export interface LogWizardState {
  currentStep: LogWizardStep;
  selectedArtist: SpotifyArtistSearchResult | null;
  venueName: string;
  venueCity: string;
  venueCountry: string;
  concertDate: string; // YYYY-MM-DD
  notes: string;
  rating: number | null;
  setlist: string[];

  // Actions
  setStep: (step: LogWizardStep) => void;
  selectArtist: (artist: SpotifyArtistSearchResult) => void;
  setVenueDetails: (details: { name: string; city: string; country: string }) => void;
  setConcertDate: (date: string) => void;
  setMemories: (memories: { notes: string; rating: number | null; setlist?: string[] }) => void;
  resetWizard: () => void;
}

const getTodayString = () => new Date().toISOString().split('T')[0] ?? '2026-10-14';

const initialState = {
  currentStep: 'artist' as LogWizardStep,
  selectedArtist: null,
  venueName: '',
  venueCity: '',
  venueCountry: '',
  concertDate: getTodayString(),
  notes: '',
  rating: null,
  setlist: [],
};

export const useLogWizardStore = create<LogWizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  selectArtist: (artist) =>
    set({
      selectedArtist: artist,
      currentStep: 'details',
    }),

  setVenueDetails: ({ name, city, country }) =>
    set({
      venueName: name,
      venueCity: city,
      venueCountry: country,
    }),

  setConcertDate: (date) => set({ concertDate: date }),

  setMemories: ({ notes, rating, setlist }) =>
    set({
      notes,
      rating,
      setlist: setlist ?? [],
    }),

  resetWizard: () =>
    set({
      ...initialState,
      concertDate: getTodayString(),
    }),
}));
