import { supabase } from '../../lib/supabase';
import type {
  Comment,
  CommonArtist,
  FeedItem,
  FollowListUser,
  FollowRequest,
  FollowStatus,
  NotificationItem,
  ProfileSearchResult,
} from './types';
import { resolveSignedMediaUrls } from '../media/signedUrls';

export async function fetchFollowList(
  userId: string,
  direction: 'following' | 'followers',
): Promise<FollowListUser[]> {
  const { data: relations, error: relationError } = await supabase
    .from('follows')
    .select('followee_id, follower_id, status')
    .eq(direction === 'following' ? 'follower_id' : 'followee_id', userId)
    .eq('status', 'accepted');
  if (relationError) throw new Error(relationError.message);

  const ids = [
    ...new Set(
      (relations ?? []).map((relation) =>
        direction === 'following' ? relation.followee_id : relation.follower_id,
      ),
    ),
  ];
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);
  if (profileError) throw new Error(profileError.message);

  let followingIds = new Set<string>();
  if (direction === 'following') {
    followingIds = new Set(ids);
  } else {
    const { data: outgoing, error: outgoingError } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
      .in('followee_id', ids);
    if (outgoingError) throw new Error(outgoingError.message);
    followingIds = new Set(
      (outgoing ?? []).map((relation) => relation.followee_id),
    );
  }
  return (profiles ?? [])
    .map((profile) => ({
      ...profile,
      is_following: followingIds.has(profile.id),
      follow_status: followingIds.has(profile.id)
        ? ('accepted' as const)
        : null,
    }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

export async function searchProfiles(
  query: string,
  limit = 20,
): Promise<ProfileSearchResult[]> {
  if (!query.trim()) return [];
  const { data, error } = await (supabase as any).rpc('search_profiles', {
    p_query: query.trim(),
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileSearchResult[];
}

export async function sendFollowRequest(
  followeeId: string,
): Promise<'accepted' | 'pending'> {
  const { data, error } = await (supabase as any).rpc('send_follow_request', {
    p_followee: followeeId,
  });
  if (error) throw new Error(error.message);
  return data as 'accepted' | 'pending';
}

export async function fetchFollowStatus(
  followeeId: string,
): Promise<FollowStatus> {
  const { data, error } = await (supabase as any)
    .from('follows')
    .select('status')
    .eq('followee_id', followeeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.status as FollowStatus) ?? null;
}

export async function unfollowUser(followeeId: string): Promise<void> {
  const { error } = await (supabase as any).rpc('unfollow_user', {
    p_followee: followeeId,
  });
  if (error) throw new Error(error.message);
}

export async function acceptFollowRequest(followerId: string): Promise<void> {
  const { error } = await (supabase as any).rpc('accept_follow_request', {
    p_follower: followerId,
  });
  if (error) throw new Error(error.message);
}

export async function declineFollowRequest(followerId: string): Promise<void> {
  const { error } = await (supabase as any).rpc('decline_follow_request', {
    p_follower: followerId,
  });
  if (error) throw new Error(error.message);
}

export async function getFollowRequests(): Promise<FollowRequest[]> {
  const { data, error } = await (supabase as any).rpc('get_follow_requests');
  if (error) throw new Error(error.message);
  return (data ?? []) as FollowRequest[];
}

export async function fetchFeedPage(
  cursor: string | null,
  userId: string,
  limit = 20,
): Promise<FeedItem[]> {
  const { data, error } = await (supabase as any).rpc('get_feed', {
    p_cursor: cursor ?? null,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  const items = (data ?? []) as FeedItem[];
  const mediaPaths = items.flatMap((item) =>
    item.media.flatMap((media) => [
      media.thumb_path,
      ...(media.poster_path ? [media.poster_path] : []),
    ]),
  );
  const signedUrls = await resolveSignedMediaUrls(mediaPaths);
  const signedItems = items.map((item) => ({
    ...item,
    media: item.media.map((media) => ({
      ...media,
      thumb_url: signedUrls[media.thumb_path],
      poster_url: media.poster_path
        ? signedUrls[media.poster_path]
        : null,
    })),
  }));
  const artistIds = [...new Set(signedItems.map((item) => item.artist_id))];
  if (!artistIds.length) return signedItems;

  const { data: overrides, error: overrideError } = await supabase
    .from('user_artist_image_overrides')
    .select('artist_id,profile_image_url,banner_image_url')
    .eq('user_id', userId)
    .in('artist_id', artistIds);
  if (overrideError) throw new Error(overrideError.message);

  const overridesByArtist = new Map(
    (overrides ?? []).map((override) => [override.artist_id, override]),
  );
  return signedItems.map((item) => {
    const override = overridesByArtist.get(item.artist_id);
    if (!override) return item;
    return {
      ...item,
      artist: {
        ...item.artist,
        image_url_large:
          override.profile_image_url ?? item.artist.image_url_large,
        banner_image_url:
          override.banner_image_url ?? item.artist.banner_image_url,
      },
    };
  });
}

export async function toggleLike(
  logId: string,
  userId: string,
  currentlyLiked: boolean,
): Promise<void> {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('log_likes')
      .delete()
      .eq('log_id', logId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('log_likes')
      .insert({ log_id: logId, user_id: userId });
    if (error) throw new Error(error.message);
  }
}

export async function fetchComments(logId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('log_comments')
    .select('*, author:profiles(id, username, display_name, avatar_url)')
    .eq('log_id', logId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    log_id: row.log_id,
    user_id: row.user_id,
    body: row.body,
    created_at: row.created_at,
    author: row.author,
  })) as Comment[];
}

export async function postComment(
  logId: string,
  userId: string,
  body: string,
): Promise<Comment> {
  const { data, error } = await supabase
    .from('log_comments')
    .insert({ log_id: logId, user_id: userId, body })
    .select('*, author:profiles(id, username, display_name, avatar_url)')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: (data as any).id,
    log_id: (data as any).log_id,
    user_id: (data as any).user_id,
    body: (data as any).body,
    created_at: (data as any).created_at,
    author: (data as any).author,
  } as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('log_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw new Error(error.message);
}

export async function fetchNotifications(
  limit = 40,
): Promise<NotificationItem[]> {
  const { data, error } = await (supabase as any).rpc('get_notifications', {
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationItem[];
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const { error } = await (supabase as any).rpc('mark_notifications_read', {
    p_ids: ids ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data, error } = await (supabase as any).rpc(
    'get_unread_notification_count',
  );
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function blockUser(blockedId: string): Promise<void> {
  const { error } = await (supabase as any).rpc('block_user', {
    p_blocked: blockedId,
  });
  if (error) throw new Error(error.message);
}

export async function submitReport(params: {
  reportedUser?: string;
  reportedLog?: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const { error } = await (supabase as any).rpc('submit_report', {
    p_reported_user: params.reportedUser ?? null,
    p_reported_log: params.reportedLog ?? null,
    p_reason: params.reason,
    p_details: params.details ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchCommonArtists(
  userA: string,
  userB: string,
): Promise<CommonArtist[]> {
  if (!userA || !userB || userA === userB) return [];
  const { data, error } = await (supabase as any).rpc('common_artists', {
    p_a: userA,
    p_b: userB,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as CommonArtist[];
}
