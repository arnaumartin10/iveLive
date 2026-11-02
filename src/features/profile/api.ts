import { supabase } from '../../lib/supabase';
import type { ProfileOverview, WishlistDraft, WishlistItem } from './types';

export async function fetchProfileOverviewByUsername(username: string) {
  const { data, error } = await supabase.rpc(
    'get_profile_overview_by_username',
    { p_username: username },
  );
  if (error) throw new Error(error.message);
  return (data as unknown as ProfileOverview | null) ?? null;
}

export async function setProfilePicks(
  list: 'recent' | 'favourite',
  artistIds: string[],
) {
  const { error } = await supabase.rpc('set_profile_picks', {
    p_list: list,
    p_artist_ids: artistIds,
  });
  if (error) throw new Error(error.message);
}

export async function addWishlistItem(userId: string, draft: WishlistDraft) {
  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      ...draft,
      event_name: draft.event_name || null,
      venue_name: draft.venue_name || null,
      city: draft.city || null,
      note: draft.note || null,
      ticket_url: draft.ticket_url || null,
      user_id: userId,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateWishlistItem(
  itemId: string,
  updates: Partial<WishlistDraft>,
) {
  const normalized = {
    ...updates,
    event_name: updates.event_name === '' ? null : updates.event_name,
    venue_name: updates.venue_name === '' ? null : updates.venue_name,
    city: updates.city === '' ? null : updates.city,
    note: updates.note === '' ? null : updates.note,
    ticket_url: updates.ticket_url === '' ? null : updates.ticket_url,
  };
  const { error } = await supabase
    .from('wishlist_items')
    .update(normalized)
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function markWishlistItemSeen(itemId: string) {
  const { error } = await supabase
    .from('wishlist_items')
    .update({ status: 'seen' })
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function deleteWishlistItem(itemId: string) {
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function fetchFullWishlist(
  userId: string,
): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select(
      '*, artist:artists(id, name, image_url_thumb, image_url_large, primary_macro)',
    )
    .eq('user_id', userId)
    .order('priority', { ascending: true })
    .order('target_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    artist_id: row.artist_id,
    artist_name: row.artist?.name ?? 'Unknown artist',
    image_url:
      row.artist?.image_url_thumb ?? row.artist?.image_url_large ?? null,
    primary_macro: row.artist?.primary_macro ?? null,
  })) as WishlistItem[];
}
