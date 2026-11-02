import { supabase } from '../../lib/supabase';
import type { CloudMode } from './simulation';
import type { UserCloudData } from './types';
import type { TerritoryStat } from './experience';
import { normalizeUserCloudData } from './normalize';

let cloudLayoutTableWarningShown = false;

function isCloudLayoutTableUnavailable(error: {
  code?: string;
  message: string;
}): boolean {
  return error.code === 'PGRST205' ||
    (error.code === '42P01' &&
      error.message.toLowerCase().includes('cloud_layouts'));
}

function warnCloudLayoutTableUnavailable(): void {
  if (cloudLayoutTableWarningShown) return;
  cloudLayoutTableWarningShown = true;
  console.warn(
    '[cloud] cloud_layouts is unavailable in the Supabase schema cache; using this device’s saved layout until the migration is applied.',
  );
}

export async function fetchUserCloudData(
  userId: string,
  year: number | null = null,
) {
  const { data, error } = await supabase.rpc('user_cloud_data', {
    p_user: userId,
    p_year: year,
  });
  if (error) throw new Error(error.message);
  const normalized = normalizeUserCloudData(data);
  if (!normalized) {
    throw new Error('The Cloud data endpoint returned an invalid response.');
  }
  const artistIds = normalized.artists.map((artist) => artist.id);
  if (artistIds.length) {
    const { data: overrides, error: overridesError } = await supabase
      .from('user_artist_image_overrides')
      .select('artist_id,profile_image_url')
      .eq('user_id', userId)
      .in('artist_id', artistIds);
    if (overridesError) throw new Error(overridesError.message);
    const imageByArtist = new Map(
      (overrides ?? []).flatMap((override) =>
        override.profile_image_url
          ? [[override.artist_id, override.profile_image_url] as const]
          : [],
      ),
    );
    for (const artist of normalized.artists) {
      const image = imageByArtist.get(artist.id);
      if (image) {
        artist.image_url_thumb = image;
        artist.image_url_large = image;
      }
    }
  }
  return normalized satisfies UserCloudData;
}

export async function fetchUserTerritoryStats(
  userId: string,
): Promise<TerritoryStat[]> {
  const { data, error } = await supabase.rpc('user_territory_stats', {
    p_user: userId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchTerritoryDiscoveries(macroSlug: string) {
  const [rated, touring] = await Promise.all([
    supabase.rpc('top_rated_artists', { p_macro: macroSlug, p_limit: 5 }),
    supabase.rpc('artists_on_tour', { p_scope: 'all', p_limit: 50 }),
  ]);
  if (rated.error) throw new Error(`top_rated_artists: ${rated.error.message}`);
  if (touring.error)
    throw new Error(`artists_on_tour: ${touring.error.message}`);
  const onTour = (touring.data ?? []).filter((artist) =>
    artist.macro_genres.includes(macroSlug),
  );
  return {
    topRated: rated.data ?? [],
    onTour,
  };
}

export async function fetchCloudLayout(
  userId: string,
  mode: CloudMode,
): Promise<Record<string, { x: number; y: number }> | null> {
  const { data, error } = await supabase
    .from('cloud_layouts')
    .select('layout_version, positions')
    .eq('user_id', userId)
    .eq('mode', mode)
    .maybeSingle();
  if (error) {
    if (isCloudLayoutTableUnavailable(error)) {
      warnCloudLayoutTableUnavailable();
      return null;
    }
    throw new Error(error.message);
  }
  if (!data || data.layout_version !== 1 || !isPositionMap(data.positions))
    return null;
  return data.positions;
}

export async function saveCloudLayout(
  userId: string,
  mode: CloudMode,
  positions: Record<string, { x: number; y: number }>,
): Promise<void> {
  const { error } = await supabase.from('cloud_layouts').upsert(
    {
      user_id: userId,
      mode,
      layout_version: 1,
      positions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,mode' },
  );
  if (error) {
    if (isCloudLayoutTableUnavailable(error)) {
      warnCloudLayoutTableUnavailable();
      return;
    }
    throw new Error(error.message);
  }
}

function isPositionMap(
  value: unknown,
): value is Record<string, { x: number; y: number }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every(
    (position) =>
      !!position &&
      typeof position === 'object' &&
      'x' in position &&
      'y' in position &&
      Number.isFinite(position.x) &&
      Number.isFinite(position.y),
  );
}
