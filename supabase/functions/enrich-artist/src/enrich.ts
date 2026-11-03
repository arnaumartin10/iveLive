import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';
import type { Database } from '../../../../src/lib/database.types.ts';
import { albumsProvider } from './providers/albums.ts';
import { lastFmProvider } from './providers/lastfm.ts';
import { musicBrainzProvider } from './providers/musicbrainz.ts';
import {
  collectProviderResults,
  mergeWeightedTags,
  resolveEnrichmentStatus,
} from './providers/merge.ts';
import { theAudioDbProvider } from './providers/theaudiodb.ts';
import { wikipediaProvider } from './providers/wikipedia.ts';
import { isBioField, selectEnglishBio } from './providers/bio.ts';
import type {
  AlbumCandidate,
  ArtistSnapshot,
  ProviderContext,
  WeightedTag,
} from './providers/types.ts';
import { runIsolatedProvider } from './providers/merge.ts';

type ArtistUpdate = Database['public']['Tables']['artists']['Update'];
type DatabaseClient = SupabaseClient<Database>;

function storedTags(value: unknown): WeightedTag[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): WeightedTag[] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const tag = item as Record<string, unknown>;
    if (typeof tag.name !== 'string' || !tag.name.trim()) return [];
    return [
      {
        name: tag.name,
        weight: Math.max(Number(tag.weight) || 1, 1),
      },
    ];
  });
}

function applyUneditedFields(
  target: ArtistUpdate,
  patch: Record<string, unknown> | undefined,
  edited: Set<string>,
) {
  if (!patch) return;
  const source = typeof patch.bio_source === 'string' ? patch.bio_source : null;
  const preserveWikipedia =
    target.bio_source === 'wikipedia' && source === 'theaudiodb';
  const preserveExistingBio = source === 'theaudiodb' && !!target.bio;
  for (const [field, value] of Object.entries(patch)) {
    if (
      preserveWikipedia &&
      ['bio', 'bio_source', 'bio_url', 'bio_lang', 'bio_attribution'].includes(
        field,
      )
    )
      continue;
    if (
      preserveExistingBio &&
      ['bio', 'bio_source', 'bio_url', 'bio_lang', 'bio_attribution'].includes(
        field,
      )
    )
      continue;
    if (
      field === 'group_image_url' &&
      target.group_image_url &&
      source !== 'wikipedia'
    )
      continue;
    if (
      !edited.has(field) &&
      value !== undefined &&
      value !== null &&
      value !== ''
    )
      Object.assign(target, { [field]: value });
  }
}

function cleanGenres(tags: WeightedTag[], denied: Set<string>): string[] {
  const unique = new Map<string, string>();
  for (const tag of tags) {
    const name = tag.name.trim().replace(/\s+/g, ' ');
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (
      !name ||
      denied.has(normalized) ||
      /^(19|20)\d{2}s?$/.test(normalized) ||
      /^\d{2}s$/.test(normalized)
    )
      continue;
    unique.set(normalized, unique.get(normalized) ?? name);
  }
  return [...unique.values()];
}

export async function enrichArtist(
  database: DatabaseClient,
  artistId: string,
  force = false,
) {
  const { data: artist, error } = await database
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();
  if (error || !artist) throw new Error(error?.message ?? 'Artist not found');
  const snapshot: ArtistSnapshot = {
    id: artist.id,
    name: artist.name,
    spotify_id: artist.spotify_id,
    genres: artist.genres ?? [],
    user_edited_fields: artist.user_edited_fields ?? [],
    lastfm_tags: storedTags(artist.lastfm_tags),
    musicbrainz_id: artist.musicbrainz_id,
    wikidata_id: artist.wikidata_id,
    wikipedia_title: artist.wikipedia_title,
    begin_year: artist.begin_year,
    begin_year_source: artist.begin_year_source,
  };
  const enrichedAt = artist.enriched_at
    ? Date.parse(artist.enriched_at)
    : Number.NaN;
  let hasRecentBannerGallery = false;
  if (
    !force &&
    artist.enrichment_status === 'done' &&
    Number.isFinite(enrichedAt) &&
    Date.now() - enrichedAt < 90 * 24 * 60 * 60 * 1000
  ) {
    const { count, error: galleryError } = await database
      .from('artist_image_gallery')
      .select('image_url', { count: 'exact', head: true })
      .eq('artist_id', artistId)
      .eq('image_role', 'banner');
    if (galleryError) throw new Error(galleryError.message);
    hasRecentBannerGallery = (count ?? 0) > 0;
  }
  if (
    !force &&
    artist.enrichment_status === 'done' &&
    Number.isFinite(enrichedAt) &&
    Date.now() - enrichedAt < 90 * 24 * 60 * 60 * 1000 &&
    hasRecentBannerGallery
  ) {
    return { artist, skipped: true, errors: [] as string[] };
  }

  const context: ProviderContext = {
    artist: snapshot,
    tags: [],
    releaseGroups: [],
    musicbrainzId: artist.musicbrainz_id,
    wikidataId: artist.wikidata_id,
    wikipediaTitle: null,
    lastfmApiKey: Deno.env.get('LASTFM_API_KEY') ?? null,
  };
  const providers = [
    musicBrainzProvider,
    lastFmProvider,
    wikipediaProvider,
    theAudioDbProvider,
    albumsProvider,
  ];
  let albums: AlbumCandidate[] | undefined;
  const collected = await collectProviderResults(providers, context);
  const patches: ArtistUpdate = {};
  const errors = collected.errors;
  for (const { result } of collected.results) {
    const nonBioPatch = Object.fromEntries(
      Object.entries(result.patch ?? {}).filter(
        ([field]) => !isBioField(field),
      ),
    );
    applyUneditedFields(
      patches,
      nonBioPatch,
      new Set(snapshot.user_edited_fields ?? []),
    );
    if (result.albums) albums = result.albums;
  }
  const selectedBio = selectEnglishBio(
    {
      bio_source: artist.bio_source,
      user_edited_fields: snapshot.user_edited_fields,
    },
    collected.results.map(({ provider, result }) => ({
      provider,
      patch: result.patch,
    })),
    context.wikipediaTitle,
  );
  if (selectedBio) {
    for (const [field, value] of Object.entries(selectedBio)) {
      if (!snapshot.user_edited_fields?.includes(field))
        Object.assign(patches, { [field]: value });
    }
  }
  const galleryImages = collected.results.flatMap(
    ({ result }) =>
      result.images?.map((image) => ({
        artist_id: artistId,
        image_url: image.image_url,
        image_role: image.image_role,
        label: image.label,
        sort_order: image.sort_order,
        source: image.source,
      })) ?? [],
  );
  if (galleryImages.length) {
    const { error: galleryError } = await database
      .from('artist_image_gallery')
      .upsert(galleryImages, {
        onConflict: 'artist_id,image_url,image_role',
      });
    if (galleryError) errors.push(`image gallery: ${galleryError.message}`);
  }

  const rawLastFmTags = collected.results.find(
    ({ provider }) => provider === 'lastfm',
  )?.result.tags;
  const mergedTags = collected.tags.length
    ? collected.tags
    : mergeWeightedTags(snapshot.lastfm_tags ?? []);
  const originalGenres = (artist.genres ?? []).map((name: string) => ({
    name,
    weight: 1,
  }));
  const classificationTags = mergedTags.length ? mergedTags : originalGenres;
  const edited = new Set(snapshot.user_edited_fields ?? []);
  const deniedResult = await database.from('genre_tag_denylist').select('tag');
  if (deniedResult.error)
    errors.push(`denylist: ${deniedResult.error.message}`);
  const denied = new Set(
    (deniedResult.data ?? []).map((row: { tag: string }) =>
      row.tag
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase(),
    ),
  );

  if (!edited.has('lastfm_tags') && rawLastFmTags?.length) {
    patches.lastfm_tags = rawLastFmTags
      .slice(0, 10)
      .map(({ name, weight }) => ({
        name,
        weight,
      }));
  }
  if (!edited.has('genres') && mergedTags.length) {
    patches.genres = cleanGenres(mergedTags, denied);
    const { data: classification, error: classificationError } =
      await database.rpc('classify_genres', {
        weighted_tags: classificationTags as never,
      });
    if (classificationError)
      errors.push(`classification: ${classificationError.message}`);
    else {
      const result = Array.isArray(classification)
        ? classification[0]
        : classification;
      if (result) {
        patches.macro_genres = result.macro_genres;
        patches.primary_macro = result.primary_macro;
        patches.sub_genres = result.sub_genres ?? [];
      }
    }
  } else if (!edited.has('genres') && !classificationTags.length) {
    patches.macro_genres = ['unclassified'];
    patches.primary_macro = 'unclassified';
    patches.sub_genres = [];
  }

  const hasTags = mergedTags.length > 0 || originalGenres.length > 0;
  const hasBio =
    (typeof patches.bio === 'string' && patches.bio.trim().length > 0) ||
    (selectedBio === null &&
      artist.bio_lang === 'en' &&
      typeof artist.bio === 'string' &&
      artist.bio.trim().length > 0);
  const hasProviderMetadata =
    collected.results.some(({ result }) =>
      Object.entries(result.patch ?? {}).some(
        ([field, value]) =>
          !isBioField(field) &&
          field !== 'bio' &&
          value !== undefined &&
          value !== null &&
          value !== '',
      ),
    ) || collected.results.some(({ result }) => !!result.images?.length);
  const hasAnyData =
    hasTags || hasBio || hasProviderMetadata || !!albums?.length;

  if (albums?.length) {
    const { error: albumError } = await database.from('artist_albums').upsert(
      albums.map((album) => ({ ...album, artist_id: artistId })),
      { onConflict: 'artist_id,musicbrainz_release_group_id' },
    );
    if (albumError) errors.push(`albums: ${albumError.message}`);
  }

  // Compute begin_year: skip if manually set, otherwise use MB result or
  // fall back to the earliest album year returned by the albums provider.
  const currentBeginYearSource = artist.begin_year_source as string | null;
  const isManualBeginYear = currentBeginYearSource === 'manual';
  if (!isManualBeginYear) {
    const patchedBeginYear = patches.begin_year as number | undefined;
    if (patchedBeginYear == null || patches.begin_year_source == null) {
      // Try to derive from earliest album if MusicBrainz didn't supply one
      if (!patchedBeginYear && albums?.length) {
        const albumYears = albums
          .map((album) => album.year)
          .filter((year): year is number => year != null && year > 1000);
        if (albumYears.length > 0) {
          patches.begin_year = Math.min(...albumYears);
          patches.begin_year_source = 'album';
        }
      }
    }
    // If still no begin_year in patches, leave existing value intact (do not null it out)
    if (patches.begin_year === undefined && artist.begin_year != null) {
      delete patches.begin_year;
      delete patches.begin_year_source;
    }
  } else {
    // Do not overwrite manual begin_year
    delete patches.begin_year;
    delete patches.begin_year_source;
  }

  const enrichmentStatus = resolveEnrichmentStatus(
    hasTags,
    errors,
    hasBio,
    hasAnyData,
  );
  patches.enrichment_status = enrichmentStatus;
  const missingData = [!hasTags && 'tags', !hasBio && 'bio'].filter(
    (value): value is string => !!value,
  );
  patches.enrichment_error = errors.length
    ? errors
        .join('; ')
        .replace(/https?:\/\/\S+/g, 'provider request failed')
        .slice(0, 240)
    : enrichmentStatus === 'failed'
      ? 'No enrichment data returned by providers'
      : enrichmentStatus === 'partial'
        ? `Missing ${missingData.join(' and ') || 'complete provider data'}`
        : null;
  patches.enriched_at = new Date().toISOString();

  const { data: updated, error: updateError } = await database
    .from('artists')
    .update(patches)
    .eq('id', artistId)
    .select('*')
    .single();
  if (updateError) throw new Error(updateError.message);
  return {
    artist: updated,
    skipped: false,
    errors,
    successfulProviders: collected.successfulProviders,
    hasTags,
  };
}

export async function enrichArtistBiosOnly(
  database: DatabaseClient,
  artistId: string,
) {
  const { data: artist, error } = await database
    .from('artists')
    .select(
      'id, name, spotify_id, musicbrainz_id, wikidata_id, wikipedia_title, bio, bio_source, bio_lang, bio_url, user_edited_fields',
    )
    .eq('id', artistId)
    .single();
  if (error || !artist) throw new Error(error?.message ?? 'Artist not found');

  const userEditedFields = artist.user_edited_fields ?? [];
  if (artist.bio_source === 'manual' || userEditedFields.includes('bio')) {
    return {
      artist,
      skipped: true,
      errors: [] as string[],
      successfulProviders: [] as string[],
    };
  }

  const snapshot = {
    id: artist.id,
    name: artist.name,
    spotify_id: artist.spotify_id,
    genres: [],
    user_edited_fields: userEditedFields,
    lastfm_tags: [],
    musicbrainz_id: artist.musicbrainz_id,
    wikidata_id: artist.wikidata_id,
    wikipedia_title: null,
    begin_year: null,
    begin_year_source: null,
  } satisfies ArtistSnapshot;
  const context: ProviderContext = {
    artist: snapshot,
    tags: [],
    releaseGroups: [],
    musicbrainzId: artist.musicbrainz_id,
    wikidataId: artist.wikidata_id,
    wikipediaTitle: null,
    lastfmApiKey: Deno.env.get('LASTFM_API_KEY') ?? null,
  };
  const errors: string[] = [];
  const successfulProviders: string[] = [];

  try {
    const result = await runIsolatedProvider(musicBrainzProvider, context);
    successfulProviders.push('musicbrainz');
    if (result.patch?.musicbrainz_id)
      context.musicbrainzId = String(result.patch.musicbrainz_id);
    if (result.patch?.wikidata_id)
      context.wikidataId = String(result.patch.wikidata_id);
    if (result.patch?.wikipedia_title)
      context.wikipediaTitle = String(result.patch.wikipedia_title);
  } catch (error) {
    errors.push(
      `musicbrainz: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const candidates: { provider: string; patch?: Record<string, unknown> }[] =
    [];
  for (const provider of [
    wikipediaProvider,
    lastFmProvider,
    theAudioDbProvider,
  ]) {
    try {
      const result = await runIsolatedProvider(provider, context);
      successfulProviders.push(provider.name);
      candidates.push({ provider: provider.name, patch: result.patch });
      if (result.patch?.wikipedia_title)
        context.wikipediaTitle = String(result.patch.wikipedia_title);
      const selected = selectEnglishBio(
        {
          bio_source: artist.bio_source,
          user_edited_fields: userEditedFields,
        },
        candidates,
        context.wikipediaTitle,
      );
      if (typeof selected?.bio === 'string') break;
    } catch (error) {
      errors.push(
        `${provider.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const bioPatch = selectEnglishBio(
    {
      bio_source: artist.bio_source,
      user_edited_fields: userEditedFields,
    },
    candidates,
    context.wikipediaTitle,
  );
  if (!bioPatch) {
    return {
      artist,
      skipped: true,
      errors,
      successfulProviders,
    };
  }

  const { data: updated, error: updateError } = await database
    .from('artists')
    .update({
      bio: bioPatch.bio,
      bio_source: bioPatch.bio_source,
      bio_url: bioPatch.bio_url,
      bio_lang: bioPatch.bio_lang,
      wikipedia_title: bioPatch.wikipedia_title,
    })
    .eq('id', artistId)
    .or('bio_source.is.null,bio_source.neq.manual')
    .not('user_edited_fields', 'cs', '{"bio"}')
    .select('id, name, bio, bio_source, bio_lang, bio_url, wikipedia_title')
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) {
    return {
      artist,
      skipped: true,
      errors,
      successfulProviders,
    };
  }
  return {
    artist: updated,
    skipped: false,
    errors,
    successfulProviders,
  };
}
