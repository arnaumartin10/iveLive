import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../lib/supabase';
import type { Json } from '../../lib/database.types';
import type { Database } from '../../lib/database.types';
import type {
  ArtistManagePermissions,
  ArtistAlbumRow,
  ArtistImageGalleryRow,
  ArtistRow,
  ArtistSearchResponse,
  ArtistSearchResult,
  ArtistWithAlbums,
  ArtistFriend,
  ArtistFriendLog,
  CreateManualArtistInput,
  SimilarArtistMatch,
  UpdateManualArtistInput,
  UserArtistImageOverride,
  UploadArtistImagesResult,
} from './types';

interface SpotifySearchDTO {
  spotifyId: string;
  name: string;
  imageLarge: string | null;
  imageThumb: string | null;
  genres: string[];
  popularity: number | null;
  existingArtistId: string | null;
  macroGenres?: string[];
}

interface SpotifySearchPayload {
  results: SpotifySearchDTO[];
}

interface FunctionErrorPayload {
  code?: unknown;
  retryAfter?: unknown;
  message?: unknown;
  error?: unknown;
  status?: unknown;
}

export async function searchArtists(
  query: string,
  signal: AbortSignal,
): Promise<ArtistSearchResponse> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return { results: [], rateLimited: false };

  const pattern = normalizeName(normalizedQuery).replace(/[\\%_]/g, '\\$&');
  const [manualResult, spotifyResult] = await Promise.all([
    supabase
      .from('artists')
      .select('*')
      .eq('source', 'manual')
      .ilike('name_normalized', `%${pattern}%`)
      .order('name', { ascending: true })
      .limit(10)
      .abortSignal(signal),
    supabase.functions
      .invoke<SpotifySearchPayload>('spotify-search', {
        body: { q: normalizedQuery, limit: 10 },
        signal,
      })
      .then((res) => {
        console.log('[spotify-search] raw invoke response:', {
          data: res.data,
          error: res.error,
        });
        return res;
      })
      .catch((error: unknown) => {
        console.log('[spotify-search] raw invoke error:', error);
        return { data: null, error };
      }),
  ]);

  if (manualResult.error) throw new Error(manualResult.error.message);

  const manualArtists = (manualResult.data ?? []).map(
    (artist): ArtistSearchResult => ({
      artistId: artist.id,
      spotifyId: artist.spotify_id,
      name: artist.name,
      imageLarge: artist.image_url_large,
      imageThumb: artist.image_url_thumb,
      genres: artist.genres,
      macroGenres: artist.macro_genres,
      popularity: artist.popularity,
      source: 'manual',
      existingArtistId: artist.id,
      artist,
    }),
  );

  let rateLimited = false;
  let spotifyErrorMessage: string | null = null;
  let spotifyArtists: ArtistSearchResult[] = [];

  if (spotifyResult.error) {
    const errorPayload = await readFunctionError(spotifyResult.error);
    if (errorPayload?.code === 'RATE_LIMITED') {
      rateLimited = true;
    } else {
      let message =
        (typeof errorPayload?.message === 'string' && errorPayload.message) ||
        (typeof errorPayload?.error === 'string' && errorPayload.error) ||
        (spotifyResult.error instanceof Error
          ? spotifyResult.error.message
          : 'Could not search Spotify');

      if (
        message.includes('Failed to send a request') ||
        message.includes('NOT_FOUND')
      ) {
        message =
          "Edge Function 'spotify-search' is not deployed to your Supabase project. Deploy it using: npx supabase functions deploy spotify-search";
      }

      if (message.toLowerCase().includes('invalid_client')) {
        message =
          'Spotify rejected its client credentials. Set a valid matching SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Supabase Function secrets.';
      }

      spotifyErrorMessage = message;
    }
  } else {
    spotifyArtists = (spotifyResult.data?.results ?? []).map((artist) => ({
      artistId: artist.existingArtistId,
      spotifyId: artist.spotifyId,
      name: artist.name,
      imageLarge: artist.imageLarge,
      imageThumb: artist.imageThumb,
      genres: artist.genres,
      macroGenres: artist.macroGenres ?? [],
      popularity: artist.popularity,
      source: 'spotify',
      existingArtistId: artist.existingArtistId,
      artist: null,
    }));
  }

  const manualNames = new Set(
    manualArtists.map((artist) => normalizeName(artist.name)),
  );
  return {
    results: [
      ...manualArtists,
      ...spotifyArtists.filter(
        (artist) => !manualNames.has(normalizeName(artist.name)),
      ),
    ],
    rateLimited,
    error: spotifyErrorMessage,
  };
}

export async function ensureArtist(
  result: ArtistSearchResult,
): Promise<ArtistRow> {
  if (result.artist) {
    scheduleArtistEnrichment(result.artist);
    return result.artist;
  }

  const existingId = result.artistId ?? result.existingArtistId;
  if (existingId) {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('id', existingId)
      .single();
    if (error) throw new Error(error.message);
    scheduleArtistEnrichment(data);
    return data;
  }

  if (result.source !== 'spotify' || !result.spotifyId) {
    throw new Error('This artist cannot be saved without a Spotify ID.');
  }

  return ensureSpotifyArtist(result.spotifyId);
}

export async function ensureSpotifyArtist(
  spotifyId: string,
): Promise<ArtistRow> {
  const { data, error } = await supabase.functions.invoke<ArtistRow>(
    'spotify-upsert-artist',
    { body: { spotifyId } },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Spotify did not return the saved artist.');
  return data;
}

export async function fetchArtistById(
  artistId: string,
): Promise<ArtistWithAlbums> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  if (error) throw new Error(error.message);
  const { data: albums, error: albumsError } = await supabase
    .from('artist_albums')
    .select('*')
    .eq('artist_id', artistId)
    .order('sort_order', { ascending: true });
  if (albumsError) {
    console.warn('[artist-albums] Could not load albums:', albumsError.message);
    return { ...data, albums: [] };
  }
  return { ...data, albums: (albums ?? []) as ArtistAlbumRow[] };
}

export async function fetchUserArtistImageOverride(
  artistId: string,
  userId: string,
): Promise<UserArtistImageOverride | null> {
  const { data, error } = await supabase
    .from('user_artist_image_overrides')
    .select('*')
    .eq('artist_id', artistId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchArtistImageGallery(
  artistId: string,
): Promise<ArtistImageGalleryRow[]> {
  const { data, error } = await supabase
    .from('artist_image_gallery')
    .select('*')
    .eq('artist_id', artistId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveUserArtistImageOverride(input: {
  artistId: string;
  userId: string;
  profileImageUrl: string | null;
  bannerImageUrl: string | null;
}): Promise<UserArtistImageOverride | null> {
  if (!input.profileImageUrl && !input.bannerImageUrl) {
    const { error } = await supabase
      .from('user_artist_image_overrides')
      .delete()
      .eq('artist_id', input.artistId)
      .eq('user_id', input.userId);
    if (error) throw new Error(error.message);
    return null;
  }

  const { data, error } = await supabase
    .from('user_artist_image_overrides')
    .upsert(
      {
        artist_id: input.artistId,
        user_id: input.userId,
        profile_image_url: input.profileImageUrl,
        banner_image_url: input.bannerImageUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,artist_id' },
    )
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchArtistFriends(
  artistId: string,
): Promise<ArtistFriend[]> {
  const { data, error } = await supabase.rpc('friends_who_saw_artist', {
    p_artist: artistId,
    p_limit: 50,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((friend) => ({
    id: friend.id,
    username: friend.username,
    display_name: friend.display_name,
    avatar_url: friend.avatar_url,
    logs_count: friend.logs_count,
    logs: parseArtistFriendLogs(friend.logs),
  }));
}

function parseArtistFriendLogs(value: Json): ArtistFriendLog[] {
  if (!Array.isArray(value)) {
    throw new Error('Artist friends response included invalid log data.');
  }
  return value.map((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error('Artist friends response included an invalid log.');
    }
    const row = entry as { [key: string]: Json | undefined };
    if (
      typeof row.id !== 'string' ||
      typeof row.event_date !== 'string' ||
      typeof row.venue_type !== 'string' ||
      typeof row.media_count !== 'number' ||
      typeof row.has_setlist !== 'boolean'
    ) {
      throw new Error('Artist friends response included an incomplete log.');
    }
    return {
      id: row.id,
      event_date: row.event_date,
      venue_type: row.venue_type,
      venue_name: typeof row.venue_name === 'string' ? row.venue_name : null,
      rating: typeof row.rating === 'number' ? row.rating : null,
      review: typeof row.review === 'string' ? row.review : null,
      media_count: row.media_count,
      has_setlist: row.has_setlist,
      top_song: typeof row.top_song === 'string' ? row.top_song : null,
    };
  });
}

export async function fetchArtistOverride(
  userId: string,
  artistId: string,
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('user_artist_overrides')
    .select('macro_genres')
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.macro_genres ?? null;
}

export async function fetchArtistOverrides(
  userId: string,
): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('user_artist_overrides')
    .select('artist_id,macro_genres')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.artist_id, row.macro_genres]));
}

export async function saveArtistOverride(
  userId: string,
  artistId: string,
  macroGenres: string[],
): Promise<void> {
  const query = supabase.from('user_artist_overrides');
  const { error } = macroGenres.length
    ? await query.upsert(
        { user_id: userId, artist_id: artistId, macro_genres: macroGenres },
        { onConflict: 'user_id,artist_id' },
      )
    : await query.delete().eq('user_id', userId).eq('artist_id', artistId);
  if (error) throw new Error(error.message);
}

export async function submitArtistReport(
  userId: string,
  artistId: string,
  details: string,
): Promise<void> {
  const { error } = await supabase.from('artist_reports').insert({
    user_id: userId,
    artist_id: artistId,
    details: details.trim(),
  });
  if (error) throw new Error(error.message);
}

export function requestArtistEnrichment(artistId: string, language?: string) {
  void supabase.functions
    .invoke('enrich-artist', {
      body: {
        artistId,
        language: language ?? Intl.DateTimeFormat().resolvedOptions().locale,
      },
    })
    .then(({ error }) => {
      if (error) console.warn('[enrich-artist] request failed', error.message);
    })
    .catch((error: unknown) => {
      console.warn('[enrich-artist] request failed', error);
    });
}

function scheduleArtistEnrichment(artist: ArtistRow) {
  const enrichedAt = artist.enriched_at
    ? Date.parse(artist.enriched_at)
    : Number.NaN;
  const staleDone =
    artist.enrichment_status === 'done' &&
    (!Number.isFinite(enrichedAt) ||
      Date.now() - enrichedAt >= 90 * 24 * 60 * 60 * 1000);
  if (artist.enrichment_status !== 'done' || staleDone) {
    requestArtistEnrichment(artist.id);
  }
}

export async function enrichArtistNow(artistId: string, language?: string) {
  const { data, error } = await supabase.functions.invoke('enrich-artist', {
    body: {
      artistId,
      force: true,
      language: language ?? Intl.DateTimeFormat().resolvedOptions().locale,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Duplicate guard: Query pg_trgm similarity on name_normalized (threshold default 0.5).
 * Returns matching artists from both manual and spotify sources stored in DB.
 */
export async function findSimilarArtists(
  queryName: string,
  similarityThreshold = 0.5,
): Promise<SimilarArtistMatch[]> {
  const trimmed = queryName.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase.rpc('find_similar_artists', {
    query_name: trimmed,
    similarity_threshold: similarityThreshold,
  });

  if (error) {
    // Graceful fallback for dev/offline if RPC is missing
    const pattern = normalizeName(trimmed).replace(/[\\%_]/g, '\\$&');
    const fallback = await supabase
      .from('artists')
      .select('*')
      .ilike('name_normalized', `%${pattern}%`)
      .limit(5);

    if (fallback.error || !fallback.data) return [];
    return fallback.data.map((a) => ({
      id: a.id,
      spotifyId: a.spotify_id,
      name: a.name,
      source: a.source,
      imageUrlThumb: a.image_url_thumb,
      imageUrlLarge: a.image_url_large,
      genres: a.genres,
      macroGenres: a.macro_genres,
      similarity: 1.0,
    }));
  }

  return (data ?? []).map((a) => ({
    id: a.id,
    spotifyId: a.spotify_id,
    name: a.name,
    source: a.source,
    imageUrlThumb: a.image_url_thumb,
    imageUrlLarge: a.image_url_large,
    genres: a.genres,
    macroGenres: a.macro_genres,
    similarity: a.similarity,
  }));
}

/**
 * Image handling: resize to 1024px (large) and 256px (thumb) with expo-image-manipulator,
 * upload both to artist-images bucket under manual/<uid>/<uuid>-large.jpg and -thumb.jpg,
 * then return public URLs.
 */
export async function processAndUploadArtistImages(
  localUri: string,
  userId: string,
): Promise<UploadArtistImagesResult> {
  const imageId = Crypto.randomUUID();

  // Resize to 1024px (large) and 256px (thumb) with square format
  const [largeResult, thumbResult] = await Promise.all([
    ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1024, height: 1024 } }],
      { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
    ),
    ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 256, height: 256 } }],
      { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
    ),
  ]);

  const largePath = `manual/${userId}/${imageId}-large.jpg`;
  const thumbPath = `manual/${userId}/${imageId}-thumb.jpg`;

  const [largeRes, thumbRes] = await Promise.all([
    fetch(largeResult.uri),
    fetch(thumbResult.uri),
  ]);

  const [largeBuffer, thumbBuffer] = await Promise.all([
    largeRes.arrayBuffer(),
    thumbRes.arrayBuffer(),
  ]);

  const [largeUpload, thumbUpload] = await Promise.all([
    supabase.storage.from('artist-images').upload(largePath, largeBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    }),
    supabase.storage.from('artist-images').upload(thumbPath, thumbBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    }),
  ]);

  if (largeUpload.error) throw new Error(largeUpload.error.message);
  if (thumbUpload.error) throw new Error(thumbUpload.error.message);

  const { data: largePublic } = supabase.storage
    .from('artist-images')
    .getPublicUrl(largePath);
  const { data: thumbPublic } = supabase.storage
    .from('artist-images')
    .getPublicUrl(thumbPath);

  return {
    imageUrlLarge: largePublic.publicUrl,
    imageUrlThumb: thumbPublic.publicUrl,
  };
}

/**
 * Insert with source='manual', created_by=auth.uid().
 * DB trigger computes macro genres from chosen genre text.
 */
export async function createManualArtist(
  input: CreateManualArtistInput,
  userId: string,
): Promise<ArtistRow> {
  let imageUrlLarge: string | null = null;
  let imageUrlThumb: string | null = null;

  if (input.photoUri) {
    const uploaded = await processAndUploadArtistImages(input.photoUri, userId);
    imageUrlLarge = uploaded.imageUrlLarge;
    imageUrlThumb = uploaded.imageUrlThumb;
  }

  const userEdited = ['genres', 'image_url_large', 'image_url_thumb'];
  if (input.beginYear != null) userEdited.push('begin_year');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      name: input.name.trim(),
      source: 'manual',
      created_by: userId,
      genres: input.genres,
      user_edited_fields: userEdited,
      image_url_large: imageUrlLarge,
      image_url_thumb: imageUrlThumb,
      begin_year: input.beginYear ?? null,
      begin_year_source: input.beginYear != null ? 'manual' : null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  requestArtistEnrichment(data.id);
  return data;
}

/**
 * Creator can edit a manual artist later from artist detail, but only if no other user has logged it.
 */
export async function updateManualArtist(
  input: UpdateManualArtistInput,
  userId: string,
): Promise<ArtistRow> {
  const permissions = await checkArtistManagePermissions(
    { id: input.id, source: 'manual', created_by: userId } as ArtistRow,
    userId,
  );

  if (!permissions.canEdit) {
    throw new Error(
      'This artist cannot be edited because other users have logged concerts with them.',
    );
  }

  const userEdited = ['genres', 'image_url_large', 'image_url_thumb'];
  if (input.beginYear !== undefined) userEdited.push('begin_year');

  const updates: Partial<Database['public']['Tables']['artists']['Update']> = {
    name: input.name.trim(),
    genres: input.genres,
    user_edited_fields: userEdited,
  };

  if (input.beginYear !== undefined) {
    updates.begin_year = input.beginYear ?? null;
    updates.begin_year_source = input.beginYear != null ? 'manual' : null;
  }

  if (input.photoUri && !input.keepExistingPhoto) {
    const uploaded = await processAndUploadArtistImages(input.photoUri, userId);
    updates.image_url_large = uploaded.imageUrlLarge;
    updates.image_url_thumb = uploaded.imageUrlThumb;
  } else if (!input.keepExistingPhoto && input.photoUri === null) {
    updates.image_url_large = null;
    updates.image_url_thumb = null;
  }

  const { data, error } = await supabase
    .from('artists')
    .update(updates)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Creator can delete a manual artist later from artist detail, but only if no other user has logged it.
 */
export async function deleteManualArtist(
  artistId: string,
  userId: string,
): Promise<void> {
  // Use stored procedure which securely enforces ownership & logs check, or fall back to client logic
  const { error: rpcError } = await supabase.rpc('delete_manual_artist', {
    p_artist_id: artistId,
  });

  if (!rpcError) return;

  // Fallback if RPC is not available in local test environment
  const { data: logs, error: checkError } = await supabase
    .from('concert_logs')
    .select('id, user_id')
    .eq('artist_id', artistId);

  if (checkError) throw new Error(checkError.message);

  const otherLogs = (logs ?? []).filter((l) => l.user_id !== userId);
  if (otherLogs.length > 0) {
    throw new Error(
      'This artist cannot be deleted because other users have logged concerts with them.',
    );
  }

  // Delete own logs first (if any) to prevent FK violation
  await supabase
    .from('concert_logs')
    .delete()
    .eq('artist_id', artistId)
    .eq('user_id', userId);

  const { error } = await supabase.from('artists').delete().eq('id', artistId);

  if (error) throw new Error(error.message);
}

/**
 * Check whether creator can edit/delete manual artist (only if no other user has logged it).
 */
export async function checkArtistManagePermissions(
  artist: ArtistRow,
  userId?: string | null,
): Promise<ArtistManagePermissions> {
  if (!userId || artist.source !== 'manual' || artist.created_by !== userId) {
    return {
      isCreator: false,
      canEdit: false,
      canDelete: false,
      otherUserLogCount: 0,
    };
  }

  const { data, error } = await supabase.rpc('can_modify_artist', {
    p_artist_id: artist.id,
  });

  if (!error && data && data[0]) {
    return {
      isCreator: data[0].is_creator,
      canEdit: data[0].can_edit,
      canDelete: data[0].can_delete,
      otherUserLogCount: Number(data[0].other_user_log_count),
    };
  }

  // Direct check fallback
  const { count, error: countError } = await supabase
    .from('concert_logs')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', artist.id)
    .neq('user_id', userId);

  if (countError) {
    return {
      isCreator: true,
      canEdit: false,
      canDelete: false,
      otherUserLogCount: 1,
    };
  }

  const otherLogs = count ?? 0;
  return {
    isCreator: true,
    canEdit: otherLogs === 0,
    canDelete: otherLogs === 0,
    otherUserLogCount: otherLogs,
  };
}

function normalizeName(name: string) {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

async function readFunctionError(
  error: unknown,
): Promise<FunctionErrorPayload | null> {
  if (!error) return null;
  const context = (error as { context?: unknown } | null)?.context;
  if (
    typeof context === 'object' &&
    context !== null &&
    'clone' in context &&
    typeof (context as Response).clone === 'function'
  ) {
    try {
      const cloned = (context as Response).clone();
      const json = await cloned.json();
      return json as FunctionErrorPayload;
    } catch {
      try {
        const text = await (context as Response).clone().text();
        return { message: text } as FunctionErrorPayload;
      } catch {
        // ignore
      }
    }
  }

  const rawMessage = (error as { message?: string })?.message;
  return rawMessage ? { message: rawMessage } : null;
}
