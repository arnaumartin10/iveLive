import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Alert, Platform } from 'react-native';
import { useAuthStore } from '../auth/store';
import { cloudTerritoryStatsKey } from '../cloud/hooks';
import {
  deleteConcert,
  fetchConcertById,
  fetchArtistConcertHistory,
  fetchMyLogs,
  fetchUserConcerts,
  fetchUserMediaCount,
  fetchUserArtistSummary,
  fetchUserVenueNames,
  logConcert,
  updateConcert,
} from './api';
import { logConcertSchema } from './schemas';
import type {
  Artist,
  ConcertWithRelations,
  LogConcertFormData,
  TimelineFilters,
  TimelineOrder,
  UpdateConcertInput,
  UserArtistSummary,
  UserGenreStats,
  UserVenueStats,
} from './types';
import type { VenueType } from '../venues/venueTypes';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const concertKeys = {
  all: ['concerts'] as const,
  list: (userId: string) => ['concerts', 'list', userId] as const,
  mediaCount: (userId: string) => ['concerts', 'media-count', userId] as const,
  myLogs: (userId: string, order?: TimelineOrder, filters?: TimelineFilters) =>
    ['concerts', 'my-logs', userId, order ?? 'newest', filters] as const,
  detail: (id: string) => ['concerts', 'detail', id] as const,
  artistHistory: (userId: string, artistId: string) =>
    ['concerts', 'artist-history', userId, artistId] as const,
  venueNames: (userId: string, venueType: VenueType) =>
    ['concerts', 'venue-names', userId, venueType] as const,
};

export const cloudKeys = {
  all: ['cloud'] as const,
  artistSummary: (userId: string) =>
    ['cloud', 'artist-summary', userId] as const,
};

export const statsKeys = {
  all: ['stats'] as const,
  artistSummary: (userId: string) =>
    ['stats', 'user_artist_summary', userId] as const,
  genreStats: (userId: string) =>
    ['stats', 'user_genre_stats', userId] as const,
  venueStats: (userId: string) =>
    ['stats', 'user_venue_stats', userId] as const,
};

export const feedKeys = {
  all: ['feed'] as const,
};

export type CreateLogInput = {
  formData: LogConcertFormData;
  artist: Artist;
};

type CreateLogContext = {
  optimisticId: string;
  previousTimeline: ConcertWithRelations[] | undefined;
  cacheSnapshots: [QueryKey, unknown][];
};

function validateLogInput(formData: LogConcertFormData): LogConcertFormData {
  const parsed = logConcertSchema.parse(formData);
  return {
    artist_id: parsed.artist_id,
    artist_name: parsed.artist_name,
    spotify_artist_id: parsed.spotify_artist_id ?? null,
    venue_type: parsed.venue_type,
    venue_name: parsed.venue_name,
    concert_date: parsed.concert_date,
    notes: parsed.notes,
    rating: parsed.rating ?? null,
  };
}

function updateArtistSummary(
  cached: UserArtistSummary[] | undefined,
  artist: Artist,
  formData: LogConcertFormData,
): UserArtistSummary[] | undefined {
  if (!cached) return cached;
  const existing = cached.find((row) => row.id === artist.id);
  const nextCount = (existing?.log_count ?? 0) + 1;
  const previousRatingTotal =
    (existing?.avg_rating ?? 0) * (existing?.log_count ?? 0);
  const nextSummary: UserArtistSummary = {
    ...artist,
    log_count: nextCount,
    avg_rating: (previousRatingTotal + (formData.rating ?? 0)) / nextCount,
    max_rating: Math.max(existing?.max_rating ?? 0, formData.rating ?? 0),
    first_seen: existing?.first_seen
      ? existing.first_seen < formData.concert_date
        ? existing.first_seen
        : formData.concert_date
      : formData.concert_date,
    last_seen: existing?.last_seen
      ? existing.last_seen > formData.concert_date
        ? existing.last_seen
        : formData.concert_date
      : formData.concert_date,
  };
  return existing
    ? cached.map((row) => (row.id === artist.id ? nextSummary : row))
    : [nextSummary, ...cached];
}

function updateGenreStats(
  cached: UserGenreStats[] | undefined,
  genres: string[],
  isNewArtist: boolean,
): UserGenreStats[] | undefined {
  if (!cached) return cached;
  const next = [...cached];
  for (const genre of genres) {
    const index = next.findIndex((row) => row.macro_genre === genre);
    if (index < 0) {
      next.push({
        macro_genre: genre,
        log_count: 1,
        artist_count: isNewArtist ? 1 : 0,
        avg_rating: null,
        top_artist: null,
        percentage: 0,
      });
    } else {
      const existing = next[index];
      if (!existing) continue;
      next[index] = {
        ...existing,
        log_count: existing.log_count + 1,
        artist_count: existing.artist_count + (isNewArtist ? 1 : 0),
      };
    }
  }
  const total = next.reduce(
    (sum, row) =>
      sum + (row.macro_genre === 'unclassified' ? 0 : row.log_count),
    0,
  );
  return next.map((row) => ({
    ...row,
    percentage:
      row.macro_genre !== 'unclassified' && total
        ? Math.round((row.log_count / total) * 10000) / 100
        : 0,
  }));
}

function updateVenueStats(
  cached: UserVenueStats[] | undefined,
  venueType: VenueType,
): UserVenueStats[] | undefined {
  if (!cached) return cached;
  const next = [...cached];
  const index = next.findIndex((row) => row.venue_type === venueType);
  if (index < 0) {
    next.push({
      venue_type: venueType,
      log_count: 1,
      artist_count: 1,
      avg_rating: null,
      top_artist: null,
      percentage: 0,
    });
  } else {
    const existing = next[index];
    if (existing)
      next[index] = { ...existing, log_count: existing.log_count + 1 };
  }
  const total = next.reduce((sum, row) => sum + row.log_count, 0);
  return next.map((row) => ({
    ...row,
    percentage: total ? Math.round((row.log_count / total) * 10000) / 100 : 0,
  }));
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useUserMediaCount(userId: string) {
  return useQuery({
    queryKey: concertKeys.mediaCount(userId),
    queryFn: () => fetchUserMediaCount(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useMyLogs({
  order = 'newest',
  filters,
  userId: propUserId,
}: {
  order?: TimelineOrder;
  filters?: TimelineFilters;
  userId?: string;
} = {}) {
  const currentUserId = useAuthStore((state) => state.user?.id ?? '');
  const userId = propUserId ?? currentUserId;

  return useInfiniteQuery<
    ConcertWithRelations[],
    Error,
    InfiniteData<
      ConcertWithRelations[],
      { event_date: string; id: string } | null
    >,
    QueryKey,
    { event_date: string; id: string } | null
  >({
    queryKey: concertKeys.myLogs(userId, order, filters),
    queryFn: ({ pageParam }) =>
      fetchMyLogs({
        userId,
        order,
        cursor: pageParam,
        limit: 30,
        filters,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 30) return null;
      const lastItem = lastPage[lastPage.length - 1];
      if (!lastItem) return null;
      return { event_date: lastItem.event_date, id: lastItem.id };
    },
    enabled: !!userId,
  });
}

export function useUserConcerts(userId: string) {
  return useQuery<ConcertWithRelations[], Error>({
    queryKey: concertKeys.list(userId),
    queryFn: () => fetchUserConcerts(userId),
    enabled: !!userId,
  });
}

export function useArtistConcertHistory(userId: string, artistId: string) {
  return useQuery<ConcertWithRelations[], Error>({
    queryKey: concertKeys.artistHistory(userId, artistId),
    queryFn: () => fetchArtistConcertHistory(userId, artistId),
    enabled: !!userId && !!artistId,
  });
}

export function useUserArtistSummary(userId: string) {
  return useQuery<UserArtistSummary[], Error>({
    queryKey: cloudKeys.artistSummary(userId),
    queryFn: () => fetchUserArtistSummary(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useConcert(id: string) {
  return useQuery<ConcertWithRelations, Error>({
    queryKey: concertKeys.detail(id),
    queryFn: () => fetchConcertById(id),
    enabled: !!id,
  });
}

export function useVenueNameSuggestions(
  userId: string,
  venueType: VenueType | null,
) {
  return useQuery<string[], Error>({
    queryKey: venueType
      ? concertKeys.venueNames(userId, venueType)
      : ['concerts', 'venue-names', userId, null],
    queryFn: () => fetchUserVenueNames(userId, venueType as VenueType),
    enabled: !!userId && !!venueType,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useCreateLog() {
  const qc = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? '');

  return useMutation<
    ConcertWithRelations,
    Error,
    CreateLogInput,
    CreateLogContext
  >({
    mutationFn: ({ formData, artist }) => {
      if (!userId) throw new Error('You must be signed in to add a show.');
      return logConcert(validateLogInput(formData), artist);
    },
    onMutate: async ({ formData: rawFormData, artist }) => {
      if (!userId) throw new Error('You must be signed in to add a show.');
      const formData = validateLogInput(rawFormData);
      const timelineKey = concertKeys.list(userId);
      await Promise.all([
        qc.cancelQueries({ queryKey: timelineKey }),
        qc.cancelQueries({ queryKey: cloudKeys.all }),
        qc.cancelQueries({ queryKey: statsKeys.all }),
        qc.cancelQueries({ queryKey: feedKeys.all }),
      ]);

      const previousTimeline =
        qc.getQueryData<ConcertWithRelations[]>(timelineKey);
      const cacheSnapshots = [
        ...qc.getQueriesData({ queryKey: cloudKeys.all }),
        ...qc.getQueriesData({ queryKey: statsKeys.all }),
      ];
      const summaryRows = [
        ...(qc.getQueryData<UserArtistSummary[]>(
          statsKeys.artistSummary(userId),
        ) ?? []),
        ...(qc.getQueryData<UserArtistSummary[]>(
          cloudKeys.artistSummary(userId),
        ) ?? []),
      ];
      const isNewArtist =
        !previousTimeline?.some((row) => row.artist_id === artist.id) &&
        !summaryRows.some((row) => row.id === artist.id);
      const optimisticId = `optimistic-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticConcert: ConcertWithRelations = {
        id: optimisticId,
        user_id: userId,
        artist_id: artist.id,
        event_date: formData.concert_date,
        venue_type: formData.venue_type,
        venue_name: formData.venue_name.trim() || null,
        rating: formData.rating,
        review: formData.notes.trim() || null,
        created_at: now,
        updated_at: now,
        artist,
      };

      qc.setQueryData<ConcertWithRelations[]>(timelineKey, [
        optimisticConcert,
        ...(previousTimeline ?? []),
      ]);

      const summaryKeys = [
        cloudKeys.artistSummary(userId),
        statsKeys.artistSummary(userId),
      ];
      for (const key of summaryKeys) {
        qc.setQueryData<UserArtistSummary[]>(key, (cached) =>
          updateArtistSummary(cached, artist, formData),
        );
      }
      const genres = [
        ...new Set(
          artist.macro_genres.length ? artist.macro_genres : ['other'],
        ),
      ];
      qc.setQueryData<UserGenreStats[]>(
        statsKeys.genreStats(userId),
        (cached) => updateGenreStats(cached, genres, isNewArtist),
      );
      qc.setQueryData<UserVenueStats[]>(
        statsKeys.venueStats(userId),
        (cached) => updateVenueStats(cached, formData.venue_type),
      );

      return { optimisticId, previousTimeline, cacheSnapshots };
    },
    onError: (_error, _input, context) => {
      if (context) {
        if (context.previousTimeline) {
          qc.setQueryData(concertKeys.list(userId), context.previousTimeline);
        } else {
          qc.removeQueries({ queryKey: concertKeys.list(userId), exact: true });
        }
        for (const [queryKey, data] of context.cacheSnapshots) {
          qc.setQueryData(queryKey, data);
        }
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    onSuccess: (newConcert, _input, context) => {
      qc.setQueryData(concertKeys.detail(newConcert.id), newConcert);
      qc.setQueryData<ConcertWithRelations[]>(
        concertKeys.list(userId),
        (cached) => [
          newConcert,
          ...(cached ?? []).filter((row) => row.id !== context?.optimisticId),
        ],
      );
      void qc.invalidateQueries({ queryKey: concertKeys.list(userId) });
      void qc.invalidateQueries({ queryKey: concertKeys.mediaCount(userId) });
      void qc.invalidateQueries({ queryKey: ['concerts', 'my-logs'] });
      void qc.invalidateQueries({ queryKey: statsKeys.artistSummary(userId) });
      void qc.invalidateQueries({ queryKey: statsKeys.genreStats(userId) });
      void qc.invalidateQueries({ queryKey: statsKeys.venueStats(userId) });
      void qc.invalidateQueries({ queryKey: statsKeys.all });
      void qc.invalidateQueries({ queryKey: cloudKeys.artistSummary(userId) });
      void qc.invalidateQueries({ queryKey: cloudTerritoryStatsKey(userId) });
      void qc.invalidateQueries({ queryKey: feedKeys.all });
      void qc.invalidateQueries({ queryKey: ['diary'] });
      void qc.invalidateQueries({
        queryKey: concertKeys.venueNames(userId, newConcert.venue_type),
      });
    },
  });
}

export function useUpdateLog() {
  const qc = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id ?? '');

  return useMutation<
    ConcertWithRelations,
    Error,
    UpdateConcertInput,
    { previousDetail?: ConcertWithRelations }
  >({
    mutationFn: ({ id, formData }) => updateConcert(id, formData),
    onMutate: async ({ id, formData }) => {
      const detailKey = concertKeys.detail(id);
      await qc.cancelQueries({ queryKey: detailKey });
      await qc.cancelQueries({ queryKey: ['concerts', 'my-logs'] });
      await qc.cancelQueries({ queryKey: concertKeys.list(userId) });

      const previousDetail = qc.getQueryData<ConcertWithRelations>(detailKey);

      // Optimistically update detail
      if (previousDetail) {
        const optimistic: ConcertWithRelations = {
          ...previousDetail,
          event_date: formData.concert_date ?? previousDetail.event_date,
          venue_type: formData.venue_type ?? previousDetail.venue_type,
          venue_name:
            formData.venue_name !== undefined
              ? formData.venue_name.trim() || null
              : previousDetail.venue_name,
          rating:
            formData.rating !== undefined
              ? formData.rating
              : previousDetail.rating,
          review:
            formData.notes !== undefined
              ? formData.notes.trim() || null
              : previousDetail.review,
          updated_at: new Date().toISOString(),
        };
        qc.setQueryData(detailKey, optimistic);
      }

      // Optimistically update all my-logs infinite query caches
      qc.setQueriesData<
        InfiniteData<
          ConcertWithRelations[],
          { event_date: string; id: string } | null
        >
      >({ queryKey: ['concerts', 'my-logs'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((item) => {
              if (item.id !== id) return item;
              return {
                ...item,
                event_date: formData.concert_date ?? item.event_date,
                venue_type: formData.venue_type ?? item.venue_type,
                venue_name:
                  formData.venue_name !== undefined
                    ? formData.venue_name.trim() || null
                    : item.venue_name,
                rating:
                  formData.rating !== undefined ? formData.rating : item.rating,
                review:
                  formData.notes !== undefined
                    ? formData.notes.trim() || null
                    : item.review,
                updated_at: new Date().toISOString(),
              };
            }),
          ),
        };
      });

      // Optimistically update list(userId)
      qc.setQueryData<ConcertWithRelations[]>(
        concertKeys.list(userId),
        (old) => {
          if (!old) return old;
          return old.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              event_date: formData.concert_date ?? item.event_date,
              venue_type: formData.venue_type ?? item.venue_type,
              venue_name:
                formData.venue_name !== undefined
                  ? formData.venue_name.trim() || null
                  : item.venue_name,
              rating:
                formData.rating !== undefined ? formData.rating : item.rating,
              review:
                formData.notes !== undefined
                  ? formData.notes.trim() || null
                  : item.review,
              updated_at: new Date().toISOString(),
            };
          });
        },
      );

      return { previousDetail };
    },
    onError: (_error, { id }, context) => {
      if (context?.previousDetail) {
        qc.setQueryData(concertKeys.detail(id), context.previousDetail);
      }
      void qc.invalidateQueries({ queryKey: ['concerts', 'my-logs'] });
      void qc.invalidateQueries({ queryKey: concertKeys.list(userId) });
      void qc.invalidateQueries({ queryKey: concertKeys.mediaCount(userId) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    onSuccess: (updated) => {
      qc.setQueryData(concertKeys.detail(updated.id), updated);
      qc.setQueriesData<
        InfiniteData<
          ConcertWithRelations[],
          { event_date: string; id: string } | null
        >
      >({ queryKey: ['concerts', 'my-logs'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((item) => (item.id === updated.id ? updated : item)),
          ),
        };
      });
      qc.setQueryData<ConcertWithRelations[]>(
        concertKeys.list(userId),
        (old) => {
          if (!old) return old;
          return old.map((item) => (item.id === updated.id ? updated : item));
        },
      );
      void qc.invalidateQueries({ queryKey: statsKeys.all });
      void qc.invalidateQueries({ queryKey: cloudKeys.all });
      void qc.invalidateQueries({ queryKey: ['diary'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });
}

export function useDeleteConcert(userId: string) {
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteConcert(id),
    onMutate: async (deletedId) => {
      await qc.cancelQueries({ queryKey: ['concerts', 'my-logs'] });
      await qc.cancelQueries({ queryKey: concertKeys.list(userId) });

      qc.setQueriesData<InfiniteData<ConcertWithRelations[], unknown>>(
        { queryKey: ['concerts', 'my-logs'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) =>
              page.filter((c) => c.id !== deletedId),
            ),
          };
        },
      );

      qc.setQueryData<ConcertWithRelations[]>(
        concertKeys.list(userId),
        (prev) => (prev ?? []).filter((c) => c.id !== deletedId),
      );
    },
    onSuccess: (_data, deletedId) => {
      qc.removeQueries({
        queryKey: concertKeys.detail(deletedId),
        exact: true,
      });
      void qc.invalidateQueries({ queryKey: ['concerts', 'my-logs'] });
      void qc.invalidateQueries({ queryKey: concertKeys.list(userId) });
      void qc.invalidateQueries({ queryKey: statsKeys.all });
      void qc.invalidateQueries({ queryKey: cloudKeys.all });
      void qc.invalidateQueries({ queryKey: ['diary'] });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onError: (error) => {
      void qc.invalidateQueries({ queryKey: ['concerts', 'my-logs'] });
      void qc.invalidateQueries({ queryKey: concertKeys.list(userId) });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = error.message || 'Check your connection and try again.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Could not delete show\n\n${message}`);
      } else {
        Alert.alert('Could not delete show', message);
      }
    },
  });
}
