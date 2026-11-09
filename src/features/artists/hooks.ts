import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  checkArtistManagePermissions,
  createManualArtist,
  deleteManualArtist,
  enrichArtistNow,
  ensureArtist,
  fetchArtistFriends,
  fetchArtistImageGallery,
  fetchUserArtistImageOverride,
  fetchArtistOverride,
  fetchArtistById,
  searchArtists,
  saveArtistOverride,
  saveUserArtistImageOverride,
  submitArtistReport,
  updateManualArtist,
} from './api';
import { supabase } from '../../lib/supabase';
import type {
  ArtistRow,
  ArtistSearchResult,
  CreateManualArtistInput,
  UpdateManualArtistInput,
} from './types';

const searchPrefix = ['artist-search'] as const;

export function useArtistSearch(query: string) {
  const queryClient = useQueryClient();
  const normalizedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    void queryClient.cancelQueries({ queryKey: searchPrefix });
    if (normalizedQuery.length < 2) {
      return;
    }

    const timeout = setTimeout(() => setDebouncedQuery(normalizedQuery), 300);
    return () => clearTimeout(timeout);
  }, [normalizedQuery, queryClient]);

  const searchQuery = useQuery({
    queryKey: [...searchPrefix, debouncedQuery],
    queryFn: ({ signal }) => searchArtists(debouncedQuery, signal),
    enabled: normalizedQuery.length >= 2 && debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    results:
      normalizedQuery.length >= 2 ? (searchQuery.data?.results ?? []) : [],
    isLoading:
      normalizedQuery.length >= 2 &&
      (searchQuery.isLoading || debouncedQuery !== normalizedQuery),
    isError: searchQuery.isError || !!searchQuery.data?.error,
    error: searchQuery.error?.message || searchQuery.data?.error || null,
    rateLimited: searchQuery.data?.rateLimited ?? false,
  };
}

export function useEnsureArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (result: ArtistSearchResult) => ensureArtist(result),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['artists'] }),
  });
}

export function useArtist(artistId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['artist', artistId] as const;

  useEffect(() => {
    if (!artistId) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['artist', artistId] });
    };
    const channel = supabase
      .channel(`artist-enrichment:${artistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artists',
          filter: `id=eq.${artistId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artist_albums',
          filter: `artist_id=eq.${artistId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [artistId, queryClient]);

  return useQuery({
    queryKey,
    queryFn: () => (artistId ? fetchArtistById(artistId) : null),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.enrichment_status === 'pending' ? 2500 : false,
  });
}

export function useUserArtistImageOverride(artistId: string, userId: string) {
  return useQuery({
    queryKey: ['artist-image-override', userId, artistId],
    queryFn: () => fetchUserArtistImageOverride(artistId, userId),
    enabled: !!artistId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useArtistImageGallery(artistId: string) {
  return useQuery({
    queryKey: ['artist-image-gallery', artistId],
    queryFn: () => fetchArtistImageGallery(artistId),
    enabled: !!artistId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useSaveUserArtistImageOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveUserArtistImageOverride,
    onSuccess: (data, input) => {
      queryClient.setQueryData(
        ['artist-image-override', input.userId, input.artistId],
        data,
      );
      void queryClient.invalidateQueries({
        queryKey: ['artist', input.artistId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['social', 'feed'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['cloud-data', input.userId],
      });
    },
  });
}

export function useEnrichArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      artistId,
      language,
    }: {
      artistId: string;
      language?: string;
    }) => enrichArtistNow(artistId, language),
    onSettled: (_data, _error, { artistId }) => {
      void queryClient.invalidateQueries({ queryKey: ['artist', artistId] });
      void queryClient.invalidateQueries({
        queryKey: ['artist-image-gallery', artistId],
      });
      void queryClient.invalidateQueries({ queryKey: ['artists'] });
    },
  });
}

export function useArtistFriends(artistId: string, userId: string) {
  return useQuery({
    queryKey: ['artist-friends', artistId, userId],
    queryFn: () => fetchArtistFriends(artistId),
    enabled: !!artistId && !!userId,
    staleTime: 60 * 1000,
  });
}

export function useArtistOverride(artistId: string, userId: string) {
  return useQuery({
    queryKey: ['artist-override', artistId, userId],
    queryFn: () => fetchArtistOverride(userId, artistId),
    enabled: !!artistId && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveArtistOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      artistId,
      macroGenres,
    }: {
      userId: string;
      artistId: string;
      macroGenres: string[];
    }) => saveArtistOverride(userId, artistId, macroGenres),
    onSuccess: (_data, { userId, artistId }) => {
      void queryClient.invalidateQueries({
        queryKey: ['artist-override', artistId, userId],
      });
      void queryClient.invalidateQueries({ queryKey: ['cloud'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useReportArtist() {
  return useMutation({
    mutationFn: ({
      userId,
      artistId,
      details,
    }: {
      userId: string;
      artistId: string;
      details: string;
    }) => submitArtistReport(userId, artistId, details),
  });
}

export function useArtistManagePermissions(
  artist?: ArtistRow | null,
  userId?: string | null,
) {
  return useQuery({
    queryKey: ['artist-permissions', artist?.id, userId],
    queryFn: () =>
      artist ? checkArtistManagePermissions(artist, userId) : null,
    enabled: !!artist && !!userId,
  });
}

export function useCreateManualArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      userId,
    }: {
      input: CreateManualArtistInput;
      userId: string;
    }) => createManualArtist(input, userId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['artists'] });
      void queryClient.invalidateQueries({ queryKey: searchPrefix });
      void queryClient.setQueryData(['artist', data.id], data);
    },
  });
}

export function useUpdateManualArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      userId,
    }: {
      input: UpdateManualArtistInput;
      userId: string;
    }) => updateManualArtist(input, userId),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['artists'] });
      void queryClient.invalidateQueries({ queryKey: searchPrefix });
      void queryClient.setQueryData(['artist', data.id], data);
      void queryClient.invalidateQueries({
        queryKey: ['artist-permissions', data.id],
      });
    },
  });
}

export function useDeleteManualArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artistId, userId }: { artistId: string; userId: string }) =>
      deleteManualArtist(artistId, userId),
    onSuccess: (_, { artistId }) => {
      void queryClient.invalidateQueries({ queryKey: ['artists'] });
      void queryClient.invalidateQueries({ queryKey: searchPrefix });
      void queryClient.removeQueries({ queryKey: ['artist', artistId] });
      void queryClient.invalidateQueries({ queryKey: ['concerts'] });
    },
  });
}
