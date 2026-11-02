import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from './store';
import {
  fetchProfile,
  isUsernameAvailable,
  updateProfile,
  updatePrivacy,
} from './api';
import type { Profile } from '../concerts/types';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (userId: string) => ['profiles', userId] as const,
  username: (username: string) => ['username-availability', username] as const,
};

export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => fetchProfile(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMe() {
  const userId = useAuthStore((state) => state.user?.id ?? '');
  return useProfile(userId);
}

export function useUsernameAvailability(username: string, enabled: boolean) {
  return useQuery({
    queryKey: profileKeys.username(username),
    queryFn: () => isUsernameAvailable(username),
    enabled: enabled && username.length > 0,
    staleTime: 0,
    retry: false,
  });
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      updates: Partial<
        Pick<
          Profile,
          | 'username'
          | 'display_name'
          | 'bio'
          | 'avatar_url'
          | 'banner_image_url'
          | 'is_private'
        >
      >,
    ) => updateProfile(userId, updates),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileKeys.detail(userId), profile);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['profile-overview'] }),
      ]);
    },
  });
}

export function useUpdatePrivacy(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isPrivate: boolean) => updatePrivacy(userId, isPrivate),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(userId), profile);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['profile-overview'] }),
      ]);
    },
  });
}
