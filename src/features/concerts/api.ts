import { supabase } from '@lib/supabase';
import * as Crypto from 'expo-crypto';
import { ensureSpotifyArtist } from '../artists/api';
import type {
  Artist,
  ConcertLogUpdate,
  ConcertWithRelations,
  FetchMyLogsParams,
  LogConcertFormData,
  UserArtistSummary,
  UserGenreStats,
  UserVenueStats,
} from './types';
import type { VenueType } from '../venues/venueTypes';
import { signMediaRows } from '../media/api';
import type { LogMedia, SignedLogMedia } from '../media/types';
import { cancelQueuedMediaForLog } from '../media/queue';

// ─── Concerts ────────────────────────────────────────────────────────────────

export async function fetchMyLogs({
  userId,
  order = 'newest',
  cursor,
  limit = 30,
  filters,
}: FetchMyLogsParams): Promise<ConcertWithRelations[]> {
  const isAscending = order === 'oldest';
  let cityLogIds: string[] | null = null;
  if (filters?.city) {
    const { data: ids, error: cityError } = await supabase.rpc(
      'user_venue_city_log_ids',
      {
        p_user: userId,
        p_city: filters.city,
        p_country: filters.country,
      },
    );
    if (cityError) throw new Error(cityError.message);
    cityLogIds = ids ?? [];
    if (!cityLogIds.length) return [];
  }

  // Use !inner join when filtering on artist fields so parent rows without match are filtered
  const hasGenreFilter = (filters?.genres?.length ?? 0) > 0;
  const selectClause = hasGenreFilter
    ? filters?.onlyMedia
      ? '*, artist:artists!inner(*), media:log_media!inner(*)'
      : '*, artist:artists!inner(*), media:log_media(*)'
    : filters?.onlyMedia
      ? '*, artist:artists(*), media:log_media!inner(*)'
      : '*, artist:artists(*), media:log_media(*)';

  let query = supabase
    .from('concert_logs')
    .select(selectClause)
    .eq('user_id', userId);

  if (filters?.venueId) query = query.eq('venue_id', filters.venueId);
  if (filters?.venueName) query = query.eq('venue_name', filters.venueName);
  if (cityLogIds) query = query.in('id', cityLogIds);
  if (filters?.venueTypes && filters.venueTypes.length > 0) {
    query = query.in('venue_type', filters.venueTypes);
  }

  if (filters?.genres && filters.genres.length > 0) {
    query = query.overlaps('artist.macro_genres', filters.genres);
  }

  if (filters?.minRating != null) {
    query = query.gte('rating', filters.minRating);
  }
  if (filters?.maxRating != null) {
    query = query.lte('rating', filters.maxRating);
  }
  if (filters?.year != null) {
    query = query
      .gte('event_date', `${filters.year}-01-01`)
      .lte('event_date', `${filters.year}-12-31`);
  }
  if (filters?.eventDate) {
    query = query.eq('event_date', filters.eventDate);
  }
  if (filters?.onlyMedia) {
    query = query.not('media.id', 'is', null);
  }

  if (cursor) {
    if (isAscending) {
      query = query.or(
        `event_date.gt.${cursor.event_date},and(event_date.eq.${cursor.event_date},id.gt.${cursor.id})`,
      );
    } else {
      query = query.or(
        `event_date.lt.${cursor.event_date},and(event_date.eq.${cursor.event_date},id.lt.${cursor.id})`,
      );
    }
  }

  query = query
    .order('event_date', { ascending: isAscending })
    .order('id', { ascending: isAscending })
    .limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return signConcertMedia(data ?? []);
}

export async function fetchUserConcerts(
  userId: string,
): Promise<ConcertWithRelations[]> {
  const { data, error } = await supabase
    .from('concert_logs')
    .select('*, artist:artists(*), media:log_media(*)')
    .eq('user_id', userId)
    .order('event_date', { ascending: false });

  if (error) throw new Error(error.message);
  return signConcertMedia(data ?? []);
}

export async function fetchUserMediaCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('log_media')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  if (count === null) throw new Error('Could not read the keepsake count.');
  return count;
}

export async function fetchArtistConcertHistory(
  userId: string,
  artistId: string,
): Promise<ConcertWithRelations[]> {
  const { data, error } = await supabase
    .from('concert_logs')
    .select('*, artist:artists(*), media:log_media(*)')
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .order('event_date', { ascending: false });
  if (error) throw new Error(error.message);
  return signConcertMedia(data ?? []);
}

export async function fetchConcertById(
  id: string,
): Promise<ConcertWithRelations> {
  const { data, error } = await supabase
    .from('concert_logs')
    .select('*, artist:artists(*), media:log_media(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  const [signed] = await signConcertMedia([data]);
  if (!signed) throw new Error('Could not load keepsake details.');
  const { data: owner, error: ownerError } = await supabase
    .from('profiles')
    .select('username,display_name,avatar_url')
    .eq('id', data.user_id)
    .maybeSingle();
  if (ownerError) {
    console.error(
      '[concert] Could not resolve the log owner for navigation.',
      ownerError,
    );
  }
  return {
    ...signed,
    owner_username: owner?.username ?? null,
    owner_display_name: owner?.display_name ?? null,
    owner_avatar_url: owner?.avatar_url ?? null,
  };
}

export async function fetchPublicConcertById(
  id: string,
): Promise<ConcertWithRelations> {
  const { data, error } = await supabase.rpc(
    'get_public_concert_log_share',
    { p_log_id: id },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('This log is private or no longer exists.');
  return data as unknown as ConcertWithRelations;
}

async function signConcertMedia(
  concerts: (Omit<ConcertWithRelations, 'media'> & {
    media?: (Omit<LogMedia, 'kind'> & { kind: string })[];
  })[],
): Promise<ConcertWithRelations[]> {
  const normalizedConcerts = concerts.map((concert) => ({
    ...concert,
    media: (concert.media ?? []).map((media): LogMedia => {
      if (media.kind !== 'image' && media.kind !== 'video') {
        throw new Error(`Unsupported keepsake media kind: ${media.kind}`);
      }
      return { ...media, kind: media.kind };
    }),
  }));
  const allMedia = normalizedConcerts.flatMap((concert) => concert.media);
  const signedRows = await signMediaRows(allMedia);
  const byId = new Map<string, SignedLogMedia>(
    signedRows.map((media) => [media.id, media]),
  );
  return normalizedConcerts.map((concert) => ({
    ...concert,
    media: (concert.media ?? []).map((media) => byId.get(media.id) ?? media),
  }));
}

export async function updateConcert(
  id: string,
  formData: Partial<LogConcertFormData>,
): Promise<ConcertWithRelations> {
  const updatePayload: ConcertLogUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (formData.concert_date !== undefined)
    updatePayload.event_date = formData.concert_date;
  if (formData.venue_type !== undefined)
    updatePayload.venue_type = formData.venue_type;
  if (formData.venue_name !== undefined) {
    updatePayload.venue_name = formData.venue_name.trim() || null;
  }
  if (formData.venue_id !== undefined) updatePayload.venue_id = formData.venue_id;
  if (formData.notes !== undefined) {
    updatePayload.review = formData.notes.trim() || null;
  }
  if (formData.rating !== undefined) {
    updatePayload.rating = formData.rating;
  }

  const { data, error } = await supabase
    .from('concert_logs')
    .update(updatePayload)
    .eq('id', id)
    .select('*, artist:artists(*), media:log_media(*)')
    .single();

  if (error) throw new Error(error.message);
  const [signed] = await signConcertMedia([data]);
  if (!signed) throw new Error('Could not load keepsake details.');
  return signed;
}

export async function fetchUserVenueNames(
  userId: string,
  venueType: VenueType,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('concert_logs')
    .select('venue_name')
    .eq('user_id', userId)
    .eq('venue_type', venueType)
    .not('venue_name', 'is', null)
    .neq('venue_name', '')
    .order('event_date', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const uniqueNames = new Map<string, string>();
  for (const row of data ?? []) {
    const name = row.venue_name?.trim();
    if (name) {
      const key = name.toLocaleLowerCase();
      if (!uniqueNames.has(key)) uniqueNames.set(key, name);
    }
  }
  return [...uniqueNames.values()];
}

export async function logConcert(
  formData: LogConcertFormData,
  selectedArtist: Artist,
): Promise<ConcertWithRelations> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError)
    throw new Error(`Could not verify your session: ${authError.message}`);
  if (!authData.user) {
    throw new Error(
      'Your session has expired. Sign in again before saving this show.',
    );
  }
  const userId = authData.user.id;
  let artistId = formData.artist_id;
  let artist = selectedArtist;

  if (!artistId) {
    if (formData.spotify_artist_id) {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('spotify_id', formData.spotify_artist_id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) {
        artist = await ensureSpotifyArtist(formData.spotify_artist_id);
      } else {
        artist = data;
      }
    } else {
      const { data, error } = await supabase
        .from('artists')
        .insert({
          name: formData.artist_name,
          source: 'manual',
          created_by: userId,
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      artist = data;
    }
    artistId = artist.id;
  }

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from('concert_logs').insert({
    id,
    user_id: userId,
    artist_id: artistId,
    event_date: formData.concert_date,
    venue_type: formData.venue_type,
    venue_id: formData.venue_id ?? null,
    venue_name: formData.venue_name || null,
    review: formData.notes || null,
    rating: formData.rating ?? null,
  });

  if (error) throw new Error(error.message);
  return {
    id,
    user_id: userId,
    artist_id: artistId,
    event_date: formData.concert_date,
    venue_type: formData.venue_type,
    venue_id: formData.venue_id ?? null,
    venue_name: formData.venue_name || null,
    rating: formData.rating ?? null,
    review: formData.notes || null,
    created_at: now,
    updated_at: now,
    artist,
    media: [],
  };
}

export async function deleteConcert(id: string): Promise<void> {
  await cancelQueuedMediaForLog(id);
  const { data: media, error: mediaError } = await supabase
    .from('log_media')
    .select('storage_path,thumb_path,poster_path')
    .eq('log_id', id);
  if (mediaError) throw new Error(mediaError.message);
  const paths = (media ?? []).flatMap((item) =>
    [item.storage_path, item.thumb_path, item.poster_path].filter(
      (path): path is string => path !== null,
    ),
  );
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from('log-media')
      .remove(paths);
    if (storageError) throw new Error(storageError.message);
  }
  const { count, error } = await supabase
    .from('concert_logs')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw new Error(error.message);
  if (count !== 1) {
    throw new Error(
      'Could not delete this log. Check that you are signed in as its owner and try again.',
    );
  }
}

export async function fetchUserArtistSummary(
  userId: string,
): Promise<UserArtistSummary[]> {
  const { data, error } = await supabase.rpc('user_artist_summary', {
    p_user: userId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchUserGenreStats(
  userId: string,
): Promise<UserGenreStats[]> {
  const { data, error } = await supabase.rpc('user_genre_stats', {
    p_user: userId,
    p_year: undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchUserVenueStats(
  userId: string,
): Promise<UserVenueStats[]> {
  const { data, error } = await supabase.rpc('user_venue_stats', {
    p_user: userId,
    p_year: undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}
