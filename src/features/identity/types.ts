import type { VenueType } from '../venues/venueTypes';

// ── RPC response (mirrors user_music_identity SQL function) ──────────────────

export type EraBucket =
  | 'pre-70s'
  | '70s'
  | '80s'
  | '90s'
  | '00s'
  | '10s'
  | '20s'
  | 'unknown';

export type EraDecade = {
  bucket?: EraBucket;
  decade: number | null;
  count: number;
  share: number;
};

export type EraCoverage = {
  known_artists: number;
  total_artists: number;
  percentage: number;
};

export type ArtistRef = {
  name: string;
  begin_year: number;
};

export type VenueShareEntry = {
  count: number;
  share: number;
};

export type GenreShareEntry = {
  count: number;
  share: number;
};

export type MusicIdentityData = {
  shows: number;
  unique_artists: number;
  venue_distribution: Partial<Record<VenueType, VenueShareEntry>>;
  genre_distribution: Record<string, GenreShareEntry>;
  repeat_artist_ratio: number;
  diversity_score: number;
  era_distribution: EraDecade[];
  era_coverage: EraCoverage;
  musical_age?: number | null;
  weighted_median_begin_year: number | null;
  oldest_artist: ArtistRef | null;
  newest_artist: ArtistRef | null;
  share_of_new_artists: number;
  average_rating_by_venue: Partial<Record<VenueType, number>>;
};

// ── Computed types ────────────────────────────────────────────────────────────

export type PrototypeId =
  | 'the_vault'
  | 'the_timeless'
  | 'the_modernist'
  | 'the_pioneer'
  | 'the_devotee'
  | 'the_omnivore'
  | 'the_specialist'
  | 'the_club_rat'
  | 'the_stadium_chaser'
  | 'eclectic_listener'
  | 'emerging_taste';

export type MusicalAge = {
  year: number;
  differenceFromBirthYear?: number | null;
  formattedText: string;
  sublabel: string;
  coveragePercent?: number;
};

export type Prototype = {
  id: PrototypeId;
  title: string;
  tagline: string;
  traits: string[];
  accentColor: string;
  confidence: number;
  runnerUp: {
    id: PrototypeId;
    title: string;
  } | null;
};

export type ComputedIdentity = {
  musicalAge: MusicalAge | null;
  eraLabel: string | null;
  prototype: Prototype | null;
  /** True when there is not enough era data to compute musical age (<3 shows with known era) */
  thinEraData: boolean;
  /** True when shows < 3 – prototype is in "Emerging Taste" state */
  thinShowData: boolean;
  showsNeededForPrototype: number;
};
