export interface WeightedTag {
  name: string;
  weight: number;
}

export interface ReleaseGroup {
  id: string;
  title: string;
  firstReleaseDate?: string;
  primaryType?: string;
  secondaryTypes?: string[];
}

export interface AlbumCandidate {
  title: string;
  year: number | null;
  cover_url: string | null;
  cover_thumb_url: string | null;
  musicbrainz_release_group_id: string;
  type: 'album' | 'ep' | 'single';
  sort_order: number;
}

export interface ArtistImageCandidate {
  image_url: string;
  image_role: 'profile' | 'banner';
  label: string;
  sort_order: number;
  source: string;
}

export interface ArtistSnapshot {
  id: string;
  name: string;
  spotify_id: string | null;
  genres: string[];
  user_edited_fields: string[];
  lastfm_tags: WeightedTag[];
  musicbrainz_id: string | null;
  wikidata_id: string | null;
  wikipedia_title: string | null;
  begin_year: number | null;
  begin_year_source: string | null;
}

export interface ProviderContext {
  artist: ArtistSnapshot;
  tags: WeightedTag[];
  releaseGroups: ReleaseGroup[];
  musicbrainzId: string | null;
  wikidataId: string | null;
  wikipediaTitle: string | null;
  lastfmApiKey: string | null;
}

export interface ProviderResult {
  patch?: Record<string, unknown>;
  tags?: WeightedTag[];
  releaseGroups?: ReleaseGroup[];
  albums?: AlbumCandidate[];
  images?: ArtistImageCandidate[];
}

export interface EnrichmentProvider {
  name: string;
  timeoutMs: number;
  run(context: ProviderContext, signal: AbortSignal): Promise<ProviderResult>;
}
