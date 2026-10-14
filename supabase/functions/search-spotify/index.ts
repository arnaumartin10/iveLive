// Supabase Edge Function: search-spotify
// Securely proxies artist search queries to Spotify Web API.
// Secrets (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) exist only in Edge Function env vars.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtistItem {
  id: string;
  name: string;
  images: Array<{ url: string; height: number; width: number }>;
  genres: string[];
  popularity: number;
}

interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtistItem[];
  };
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getSpotifyToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env variables');
  }

  const authHeader = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spotify token error: ${response.status} ${errorText}`);
  }

  const tokenData: SpotifyTokenResponse = await response.json();
  cachedToken = tokenData.access_token;
  tokenExpiresAt = now + tokenData.expires_in * 1000;
  return cachedToken;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ artists: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getSpotifyToken();
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/search?type=artist&limit=10&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!spotifyRes.ok) {
      const errText = await spotifyRes.text();
      return new Response(JSON.stringify({ error: errText }), {
        status: spotifyRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data: SpotifySearchResponse = await spotifyRes.json();
    const artists = data.artists.items.map((item) => ({
      spotify_id: item.id,
      name: item.name,
      image_url: item.images[0]?.url ?? null,
      genres: item.genres ?? [],
    }));

    return new Response(JSON.stringify({ artists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
