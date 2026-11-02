import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addWishlistItem,
  deleteWishlistItem,
  fetchFullWishlist,
  fetchProfileOverviewByUsername,
  setProfilePicks,
  updateWishlistItem,
} from './api';
import type { ProfileOverview, ProfilePick, WishlistDraft } from './types';

export const profileQueryKeys = {
  all: ['profile-overview'] as const,
  overview: (username: string) => ['profile-overview', username] as const,
  wishlist: (username: string) => ['profile-wishlist', username] as const,
};

export function useProfileOverview(username: string) {
  return useQuery({
    queryKey: profileQueryKeys.overview(username),
    queryFn: () => fetchProfileOverviewByUsername(username),
    enabled: username.length > 0,
    staleTime: 60_000,
  });
}

export function useWishlist(username: string) {
  const query = useProfileOverview(username);
  return { ...query, data: query.data?.wishlist };
}

export function useFullWishlist(username: string, userId?: string) {
  return useQuery({
    queryKey: profileQueryKeys.wishlist(username),
    queryFn: () => fetchFullWishlist(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useSetPicks(username: string) {
  const queryClient = useQueryClient();
  const queryKey = profileQueryKeys.overview(username);

  return useMutation({
    mutationFn: ({
      list,
      picks,
    }: {
      list: 'recent' | 'favourite';
      picks: ProfilePick[];
    }) =>
      setProfilePicks(
        list,
        picks.map((pick) => pick.id),
      ),
    onMutate: async ({ list, picks }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProfileOverview | null>(
        queryKey,
      );
      queryClient.setQueryData<ProfileOverview | null>(queryKey, (current) => {
        if (!current || current.restricted) return current;
        return {
          ...current,
          [list === 'recent' ? 'recent_picks' : 'favourite_picks']: picks.map(
            (pick, index) => ({ ...pick, position: index + 1 }),
          ),
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useAddWishlistItem(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, draft }: { userId: string; draft: WishlistDraft }) =>
      addWishlistItem(userId, draft),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: profileQueryKeys.overview(username),
      });
      void queryClient.invalidateQueries({
        queryKey: profileQueryKeys.wishlist(username),
      });
    },
  });
}

export function useUpdateWishlistItem(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: Partial<WishlistDraft>;
    }) => updateWishlistItem(itemId, updates),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: profileQueryKeys.overview(username),
      });
      void queryClient.invalidateQueries({
        queryKey: profileQueryKeys.wishlist(username),
      });
    },
  });
}

export function useDeleteWishlistItem(username: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteWishlistItem(itemId),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: profileQueryKeys.overview(username),
      });
      void queryClient.invalidateQueries({
        queryKey: profileQueryKeys.wishlist(username),
      });
    },
  });
}
