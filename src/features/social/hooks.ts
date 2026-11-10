import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from '../auth/store';
import { supabase } from '../../lib/supabase';
import {
  acceptFollowRequest,
  blockUser,
  declineFollowRequest,
  deleteComment,
  fetchComments,
  fetchCommonArtists,
  fetchFollowList,
  fetchFeedPage,
  fetchFollowStatus,
  fetchNotifications,
  getFollowRequests,
  getUnreadNotificationCount,
  markNotificationsRead,
  postComment,
  searchProfiles,
  sendFollowRequest,
  submitReport,
  toggleLike,
  unfollowUser,
} from './api';
import type { FeedItem, FollowStatus } from './types';

let notificationSubscriptionSequence = 0;
let feedSubscriptionSequence = 0;
let commentsSubscriptionSequence = 0;

// ─── Query keys ─────────────────────────────────────────────────────────────
export const socialKeys = {
  search: (q: string) => ['social', 'search', q] as const,
  feed: ['social', 'feed'] as const,
  followRequests: ['social', 'follow-requests'] as const,
  following: (userId: string) => ['social', 'following', userId] as const,
  followers: (userId: string) => ['social', 'followers', userId] as const,
  notifications: ['social', 'notifications'] as const,
  unreadCount: ['social', 'unread-count'] as const,
  comments: (logId: string) => ['social', 'comments', logId] as const,
  feedForUser: (userId: string) => ['social', 'feed', userId] as const,
};

function adjustFeedCommentCount(
  queryClient: ReturnType<typeof useQueryClient>,
  logId: string,
  change: 1 | -1,
) {
  queryClient.setQueriesData<InfiniteData<FeedItem[], string | null>>(
    { queryKey: socialKeys.feed },
    (feed) => {
      if (!feed) return feed;
      return {
        ...feed,
        pages: feed.pages.map((page) =>
          page.map((item) =>
            item.id === logId
              ? {
                  ...item,
                  comment_count: Math.max(0, item.comment_count + change),
                }
              : item,
          ),
        ),
      };
    },
  );
}

export function useFollowing(userId: string, enabled = true) {
  return useQuery({
    queryKey: socialKeys.following(userId),
    queryFn: () => fetchFollowList(userId, 'following'),
    enabled: !!userId && enabled,
    staleTime: 30_000,
  });
}

export function useFollowers(userId: string, enabled = true) {
  return useQuery({
    queryKey: socialKeys.followers(userId),
    queryFn: () => fetchFollowList(userId, 'followers'),
    enabled: !!userId && enabled,
    staleTime: 30_000,
  });
}

// ─── Profile search ──────────────────────────────────────────────────────────
export function useProfileSearch(query: string) {
  return useQuery({
    queryKey: socialKeys.search(query),
    queryFn: () => searchProfiles(query),
    enabled: query.trim().length >= 1,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

// ─── Follow / Unfollow ───────────────────────────────────────────────────────
export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followeeId }: { followeeId: string; query?: string }) =>
      sendFollowRequest(followeeId),
    onMutate: async ({ followeeId, query }) => {
      if (query) {
        await queryClient.cancelQueries({ queryKey: socialKeys.search(query) });
        const previous = queryClient.getQueryData(socialKeys.search(query));
        queryClient.setQueryData(socialKeys.search(query), (old: any[]) =>
          old?.map((p) =>
            p.id === followeeId
              ? {
                  ...p,
                  is_following: true,
                  follow_status: 'pending' as FollowStatus,
                }
              : p,
          ),
        );
        return { previous, query };
      }
      return { previous: undefined, query };
    },
    onError: (_err, { query }, ctx: any) => {
      if (query && ctx?.previous) {
        queryClient.setQueryData(socialKeys.search(query), ctx.previous);
      }
    },
    onSuccess: (status, { followeeId, query }) => {
      if (query) {
        queryClient.setQueryData(socialKeys.search(query), (old: any[]) =>
          old?.map((p) =>
            p.id === followeeId
              ? { ...p, is_following: true, follow_status: status }
              : p,
          ),
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['social', 'following'] });
      void queryClient.invalidateQueries({ queryKey: ['social', 'followers'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-overview'] });
      void queryClient.invalidateQueries({
        queryKey: socialKeys.followRequests,
      });
      void queryClient.invalidateQueries({
        queryKey: ['social', 'follow-status'],
      });
    },
  });
}

export function useUnfollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followeeId }: { followeeId: string; query?: string }) =>
      unfollowUser(followeeId),
    onMutate: async ({ followeeId, query }) => {
      if (query) {
        await queryClient.cancelQueries({ queryKey: socialKeys.search(query) });
        const previous = queryClient.getQueryData(socialKeys.search(query));
        queryClient.setQueryData(socialKeys.search(query), (old: any[]) =>
          old?.map((p) =>
            p.id === followeeId
              ? { ...p, is_following: false, follow_status: null }
              : p,
          ),
        );
        return { previous, query };
      }
      return { previous: undefined, query };
    },
    onError: (_err, { query }, ctx: any) => {
      if (query && ctx?.previous) {
        queryClient.setQueryData(socialKeys.search(query), ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['social', 'following'] });
      void queryClient.invalidateQueries({ queryKey: ['social', 'followers'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-overview'] });
      void queryClient.invalidateQueries({
        queryKey: socialKeys.followRequests,
      });
      void queryClient.invalidateQueries({
        queryKey: ['social', 'follow-status'],
      });
    },
  });
}

export function useFollowStatus(followeeId?: string) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['social', 'follow-status', userId, followeeId],
    queryFn: () => fetchFollowStatus(followeeId!),
    enabled: !!userId && !!followeeId,
    staleTime: 15_000,
  });
}

// ─── Follow requests ─────────────────────────────────────────────────────────
export function useFollowRequests(enabled = true) {
  return useQuery({
    queryKey: socialKeys.followRequests,
    queryFn: getFollowRequests,
    enabled,
    staleTime: 30_000,
  });
}

export function useAcceptFollowRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (followerId: string) => acceptFollowRequest(followerId),
    onMutate: async (followerId) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.followRequests });
      const previous = queryClient.getQueryData(socialKeys.followRequests);
      queryClient.setQueryData(socialKeys.followRequests, (old: any[]) =>
        old?.filter((r) => r.id !== followerId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx: any) => {
      queryClient.setQueryData(socialKeys.followRequests, ctx?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['social', 'followers'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-overview'] });
      void queryClient.invalidateQueries({
        queryKey: socialKeys.followRequests,
      });
    },
  });
}

export function useDeclineFollowRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (followerId: string) => declineFollowRequest(followerId),
    onMutate: async (followerId) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.followRequests });
      const previous = queryClient.getQueryData(socialKeys.followRequests);
      queryClient.setQueryData(socialKeys.followRequests, (old: any[]) =>
        old?.filter((r) => r.id !== followerId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx: any) => {
      queryClient.setQueryData(socialKeys.followRequests, ctx?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: socialKeys.followRequests,
      });
    },
  });
}

// ─── Activity feed with infinite scroll + realtime ───────────────────────────
export function useFeed(enabled = true) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const query = useInfiniteQuery({
    queryKey: socialKeys.feedForUser(userId ?? ''),
    queryFn: ({ pageParam }) =>
      fetchFeedPage(pageParam as string | null, userId ?? ''),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedItem[]) => {
      if (lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1]?.created_at ?? undefined;
    },
    enabled,
    staleTime: 60_000,
  });

  // Realtime subscription for new concert_logs (feed updates)
  useEffect(() => {
    if (!userId || !enabled) return;
    const topic = `feed-realtime:${userId}:${++feedSubscriptionSequence}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'concert_logs' },
        (_payload: any) => {
          // We can't filter by followed users client-side easily,
          // so we just invalidate for next pull-to-refresh
          void queryClient.invalidateQueries({ queryKey: socialKeys.feed });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, enabled]);

  return query;
}

// ─── Like toggle with optimistic update ──────────────────────────────────────
export function useToggleLike() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? '');

  return useMutation({
    mutationFn: ({ logId, liked }: { logId: string; liked: boolean }) =>
      toggleLike(logId, userId, liked),
    onMutate: async ({ logId, liked }) => {
      const feedKey = socialKeys.feedForUser(userId);
      await queryClient.cancelQueries({ queryKey: feedKey });
      const previousPages = queryClient.getQueryData(feedKey);

      queryClient.setQueryData(feedKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: FeedItem[]) =>
            page.map((item) =>
              item.id === logId
                ? {
                    ...item,
                    liked_by_me: !liked,
                    like_count: item.like_count + (liked ? -1 : 1),
                  }
                : item,
            ),
          ),
        };
      });

      return { previousPages };
    },
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.previousPages) {
        queryClient.setQueryData(
          socialKeys.feedForUser(userId),
          ctx.previousPages,
        );
      }
    },
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────
export function useComments(logId: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: socialKeys.comments(logId),
    queryFn: () => fetchComments(logId),
    enabled: !!logId && enabled,
    staleTime: 30_000,
  });

  // Realtime comments subscription
  useEffect(() => {
    if (!logId || !enabled) return;
    const topic = `comments-realtime:${logId}:${++commentsSubscriptionSequence}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'log_comments',
          filter: `log_id=eq.${logId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: socialKeys.comments(logId),
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [logId, queryClient, enabled]);

  return query;
}

export function usePostComment(logId: string) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const profile = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (body: string) => postComment(logId, userId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.comments(logId) });
      const previous = queryClient.getQueryData(socialKeys.comments(logId));
      adjustFeedCommentCount(queryClient, logId, 1);
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        log_id: logId,
        user_id: userId,
        body,
        created_at: new Date().toISOString(),
        author: {
          id: userId,
          username: (profile as any)?.user_metadata?.username ?? 'you',
          display_name: null,
          avatar_url: null,
        },
      };
      queryClient.setQueryData(socialKeys.comments(logId), (old: any[]) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { previous };
    },
    onError: (_err, _body, ctx: any) => {
      queryClient.setQueryData(socialKeys.comments(logId), ctx?.previous);
      void queryClient.invalidateQueries({ queryKey: socialKeys.feed });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: socialKeys.comments(logId),
      });
      void queryClient.invalidateQueries({
        queryKey: ['social', 'logs-social-stats'],
      });
      void queryClient.invalidateQueries({ queryKey: socialKeys.feed });
      void queryClient.invalidateQueries({ queryKey: ['diary'] });
    },
  });
}

export function useDeleteComment(logId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.comments(logId) });
      const previous = queryClient.getQueryData(socialKeys.comments(logId));
      adjustFeedCommentCount(queryClient, logId, -1);
      queryClient.setQueryData(socialKeys.comments(logId), (old: any[]) =>
        old?.filter((c) => c.id !== commentId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx: any) => {
      queryClient.setQueryData(socialKeys.comments(logId), ctx?.previous);
      void queryClient.invalidateQueries({ queryKey: socialKeys.feed });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['social', 'logs-social-stats'],
      });
      void queryClient.invalidateQueries({ queryKey: socialKeys.feed });
      void queryClient.invalidateQueries({ queryKey: ['diary'] });
    },
  });
}

// ─── Notifications ───────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: socialKeys.notifications,
    queryFn: () => fetchNotifications(),
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: socialKeys.unreadCount,
    queryFn: getUnreadNotificationCount,
    enabled: !!userId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return;
    const topic = `notifications-realtime:${userId}:${++notificationSubscriptionSequence}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: socialKeys.unreadCount,
          });
          void queryClient.invalidateQueries({
            queryKey: socialKeys.notifications,
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: socialKeys.notifications,
      });
      queryClient.setQueryData(socialKeys.unreadCount, 0);
    },
  });
}

// ─── Block / Report ──────────────────────────────────────────────────────────
export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: socialKeys.feed });
    },
  });
}

export function useSubmitReport() {
  return useMutation({
    mutationFn: submitReport,
  });
}

// ─── Compare / Common artists ───────────────────────────────────────────────
export function useCommonArtists(userA: string, userB: string) {
  return useQuery({
    queryKey: ['social', 'common-artists', userA, userB],
    queryFn: () => fetchCommonArtists(userA, userB),
    enabled: !!userA && !!userB && userA !== userB,
    staleTime: 60_000,
  });
}

// ─── Timeline Logs Social Stats ─────────────────────────────────────────────
export function useLogsSocialStats(logIds: string[], enabled = true) {
  const userId = useAuthStore((s) => s.user?.id);
  const sortedKey = logIds.slice().sort().join(',');

  return useQuery({
    queryKey: ['social', 'logs-social-stats', userId ?? 'anonymous', sortedKey],
    queryFn: async () => {
      if (logIds.length === 0) return {};
      const [likesRes, commentsRes] = await Promise.all([
        supabase
          .from('log_likes')
          .select('log_id, user_id')
          .in('log_id', logIds),
        supabase.from('log_comments').select('log_id').in('log_id', logIds),
      ]);
      if (likesRes.error) throw new Error(likesRes.error.message);
      if (commentsRes.error) throw new Error(commentsRes.error.message);
      const statsMap: Record<
        string,
        { likeCount: number; commentCount: number; likedByMe: boolean }
      > = {};
      for (const id of logIds) {
        statsMap[id] = { likeCount: 0, commentCount: 0, likedByMe: false };
      }
      for (const row of (likesRes.data ?? []) as any[]) {
        const entry =
          statsMap[row.log_id] ??
          (statsMap[row.log_id] = {
            likeCount: 0,
            commentCount: 0,
            likedByMe: false,
          });
        entry.likeCount++;
        if (row.user_id === userId) entry.likedByMe = true;
      }
      for (const row of (commentsRes.data ?? []) as any[]) {
        const entry =
          statsMap[row.log_id] ??
          (statsMap[row.log_id] = {
            likeCount: 0,
            commentCount: 0,
            likedByMe: false,
          });
        entry.commentCount++;
      }
      return statsMap;
    },
    enabled: enabled && logIds.length > 0,
    staleTime: 20_000,
  });
}

export function useToggleLogLike() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? '');

  return useMutation({
    mutationFn: ({ logId, liked }: { logId: string; liked: boolean }) =>
      toggleLike(logId, userId, liked),
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['social', 'logs-social-stats'],
      });
      void queryClient.invalidateQueries({ queryKey: ['diary'] });
      void queryClient.invalidateQueries({ queryKey: socialKeys.feed });
    },
  });
}
