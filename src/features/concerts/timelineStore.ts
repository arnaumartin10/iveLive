import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TimelineOrder } from './types';
import type { VenueType } from '../venues/venueTypes';

export interface TimelineFilterState {
  venueTypes: VenueType[];
  genres: string[];
  minRating: number | null;
  maxRating: number | null;
  year?: number;
  eventDate?: string;
  onlyMedia?: boolean;
}

const initialFilters: TimelineFilterState = {
  venueTypes: [],
  genres: [],
  minRating: null,
  maxRating: null,
};

interface TimelineStoreState {
  order: TimelineOrder;
  setOrder: (order: TimelineOrder) => void;
  filters: TimelineFilterState;
  setVenueTypes: (venueTypes: VenueType[]) => void;
  toggleVenueType: (venueType: VenueType) => void;
  setGenres: (genres: string[]) => void;
  toggleGenre: (genre: string) => void;
  setMinRating: (minRating: number | null) => void;
  setFilters: (filters: Partial<TimelineFilterState>) => void;
  resetFilters: () => void;
  clear: () => void;
  hasActiveFilters: () => boolean;
  activeFilterCount: () => number;
}

export const useTimelineStore = create<TimelineStoreState>()(
  persist(
    (set, get) => ({
      order: 'newest',
      setOrder: (order) => set({ order }),

      filters: { ...initialFilters },

      setVenueTypes: (venueTypes) =>
        set((state) => ({
          filters: { ...state.filters, venueTypes },
        })),

      toggleVenueType: (venueType) =>
        set((state) => {
          const current = state.filters.venueTypes;
          const next = current.includes(venueType)
            ? current.filter((v) => v !== venueType)
            : [...current, venueType];
          return { filters: { ...state.filters, venueTypes: next } };
        }),

      setGenres: (genres) =>
        set((state) => ({
          filters: { ...state.filters, genres },
        })),

      toggleGenre: (genre) =>
        set((state) => {
          const current = state.filters.genres;
          const next = current.includes(genre)
            ? current.filter((g) => g !== genre)
            : [...current, genre];
          return { filters: { ...state.filters, genres: next } };
        }),

      setMinRating: (minRating) =>
        set((state) => ({
          filters: { ...state.filters, minRating },
        })),

      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),

      resetFilters: () =>
        set({
          filters: { ...initialFilters },
        }),

      clear: () =>
        set({
          order: 'newest',
          filters: { ...initialFilters },
        }),

      hasActiveFilters: () => {
        const { filters } = get();
        return (
          filters.venueTypes.length > 0 ||
          filters.genres.length > 0 ||
          filters.minRating !== null ||
          filters.maxRating !== null ||
          filters.year !== undefined ||
          filters.eventDate !== undefined ||
          filters.onlyMedia === true
        );
      },

      activeFilterCount: () => {
        const { filters } = get();
        let count = 0;
        count += filters.venueTypes.length;
        count += filters.genres.length;
        if (filters.minRating !== null) count += 1;
        if (filters.maxRating !== null) count += 1;
        if (filters.year !== undefined) count += 1;
        if (filters.eventDate !== undefined) count += 1;
        if (filters.onlyMedia) count += 1;
        return count;
      },
    }),
    {
      name: 'ivelive-timeline-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        order: state.order,
      }),
    },
  ),
);
