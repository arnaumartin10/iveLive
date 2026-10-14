import { supabase } from '@lib/supabase';
import type { SpotifyArtistSearchResult } from './types';

// Curated catalog fallback for offline mode or development without live Spotify keys
const MOCK_CATALOG: SpotifyArtistSearchResult[] = [
  {
    spotify_id: '4Z8W4fKeB5YxbusRsdQVPb',
    name: 'Radiohead',
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop',
    genres: ['art rock', 'alternative rock', 'electronic'],
  },
  {
    spotify_id: '7ltDVBr6mKhRvJCcedOaq3',
    name: 'Rosalía',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop',
    genres: ['flamenco nuevo', 'latin pop', 'reggaeton'],
  },
  {
    spotify_id: '0epOFNiUfyON9DRx7rtzXM',
    name: 'The Strokes',
    image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop',
    genres: ['garage rock revival', 'indie rock'],
  },
  {
    spotify_id: '6M2wZ9GZgrQXHCFfjv46we',
    name: 'Dua Lipa',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop',
    genres: ['dance pop', 'pop', 'disco'],
  },
  {
    spotify_id: '3ZZAL1mC5p9c8gVpX5iM3O',
    name: 'Fontaines D.C.',
    image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop',
    genres: ['post-punk', 'irish indie'],
  },
  {
    spotify_id: '066X20Nz7iquqkk9J6GtAU',
    name: 'LCD Soundsystem',
    image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop',
    genres: ['dance-punk', 'electronic'],
  },
  {
    spotify_id: '4oLeDaHGWFk2NgkfeZ43AY',
    name: 'Fred again..',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop',
    genres: ['uk dance', 'house', 'electronic'],
  },
  {
    spotify_id: '7Ln80gUS6He07XvHI8qqHH',
    name: 'Arctic Monkeys',
    image_url: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&auto=format&fit=crop',
    genres: ['garage rock', 'indie rock'],
  },
  {
    spotify_id: '1Xyo4u8uXC1ZmMpatF05PJ',
    name: 'The Weeknd',
    image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop',
    genres: ['canadian contemporary r&b', 'pop'],
  },
  {
    spotify_id: '246dkjvS1zLTtiykXe5h60',
    name: 'Post Malone',
    image_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop',
    genres: ['dfw rap', 'melodic rap', 'pop'],
  },
];

/**
 * Searches for artists via Supabase Edge Function 'search-spotify'.
 * Strictly enforces that Spotify is NEVER called directly from the client bundle.
 * Falls back to curated catalog if Edge Function is unconfigured or unreachable.
 */
export async function searchSpotifyArtists(query: string): Promise<SpotifyArtistSearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  try {
    const { data, error } = await supabase.functions.invoke<{ artists?: SpotifyArtistSearchResult[] }>(
      'search-spotify',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (error || !data?.artists) {
      throw error ?? new Error('No artists returned from edge function');
    }

    return data.artists;
  } catch {
    // Graceful offline & dev fallback to matching items in mock catalog + arbitrary artist generator
    const matches = MOCK_CATALOG.filter((a) =>
      a.name.toLowerCase().includes(cleanQuery),
    );

    if (matches.length > 0) {
      return matches;
    }

    // Allow user to log any custom artist name even if not in seed catalog
    return [
      {
        spotify_id: `custom_${Date.now()}`,
        name: query.trim(),
        image_url: null,
        genres: ['live'],
      },
      ...MOCK_CATALOG.slice(0, 3),
    ];
  }
}
