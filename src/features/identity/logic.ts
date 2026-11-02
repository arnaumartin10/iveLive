/**
 * Pure computation functions for music identity.
 * No React, no side effects – fully unit-testable.
 */

import type {
  ComputedIdentity,
  EraDecade,
  MusicIdentityData,
  MusicalAge,
  Prototype,
  PrototypeId,
} from './types';
import { RAW } from '../../theme/palette';

export const MIN_SHOWS_FOR_PROTOTYPE = 3;
export const MIN_SHOWS_WITH_ERA_FOR_MUSICAL_AGE = 3;

export const PROTOTYPE_METADATA: Record<
  PrototypeId,
  {
    title: string;
    tagline: string;
    traits: string[];
    accentColor: string;
  }
> = {
  the_vault: {
    title: 'The Vault',
    tagline: 'You do not just attend shows, you visit music history.',
    traits: ['Pre-2000s Heavy', 'Classic Era', 'Deep Archives'],
    accentColor: RAW.orange,
  },
  the_timeless: {
    title: 'The Timeless',
    tagline: 'Music without boundaries across eras and decades.',
    traits: ['Multi-Decade', 'Cross-Generational', 'Balanced Taste'],
    accentColor: RAW.mauve,
  },
  the_modernist: {
    title: 'The Modernist',
    tagline: 'Tuned strictly to the sound of today and tomorrow.',
    traits: ['2010s+ Native', 'Contemporary', 'Fresh Sound'],
    accentColor: RAW.slate,
  },
  the_pioneer: {
    title: 'The Pioneer',
    tagline: 'Catching rising stars before anyone else even knows their name.',
    traits: ['Early Adopter', 'Debut Chaser', 'Underground Scout'],
    accentColor: RAW.slate,
  },
  the_devotee: {
    title: 'The Devotee',
    tagline: "You don't just like music, you commit.",
    traits: ['High Loyalty', 'Repeat Attender', 'Dedicated Fan'],
    accentColor: RAW.mauve,
  },
  the_omnivore: {
    title: 'The Omnivore',
    tagline: 'An insatiable appetite for every sound under the sun.',
    traits: ['High Diversity', 'Genre-Fluid', 'Eclectic Appetite'],
    accentColor: RAW.orange,
  },
  the_specialist: {
    title: 'The Specialist',
    tagline: 'A master of one true sonic lane.',
    traits: ['Deep Focus', 'Genre Purist', 'Dedicated Scene'],
    accentColor: RAW.violet,
  },
  the_club_rat: {
    title: 'The Club Rat',
    tagline: 'The sweat, bass, and intimacy of small venues is your sanctuary.',
    traits: ['Club Native', 'Intimate Stages', 'Front Row Regular'],
    accentColor: RAW.orange,
  },
  the_stadium_chaser: {
    title: 'The Stadium Chaser',
    tagline: 'Massive stages, festival crowds, and towering sound give you life.',
    traits: ['Spectacle Seeker', 'Festival Fanatic', 'Arena Scale'],
    accentColor: RAW.wheat,
  },
  eclectic_listener: {
    title: 'Eclectic Listener',
    tagline: 'Unbound by rules or single genres, guided purely by vibe.',
    traits: ['Free Spirit', 'Varied Taste', 'Open-Minded'],
    accentColor: RAW.slate,
  },
  emerging_taste: {
    title: 'Emerging Taste',
    tagline: 'Keep logging to unlock your identity',
    traits: ['Gathering Data', 'Early Stage', 'Keep Logging'],
    accentColor: RAW.slate,
  },
};

export const THRESHOLDS = {
  vaultPre2000Share: 50,
  modernist2010sShare: 70,
  timelessMaxSingleEraShare: 40,
  timelessMinActiveEras: 3,
  pioneerNewArtistShare: 40,
  devoteeRepeatRatio: 45,
  omnivoreDiversityScore: 80,
  omnivoreMinGenres: 4,
  specialistGenreShare: 60,
  clubRatVenueShare: 70,
  stadiumChaserVenueShare: 70,
} as const;

// ── Era breakdown helpers ─────────────────────────────────────────────────────

export function getPre2000sShare(eraDistribution: EraDecade[]): number {
  return eraDistribution
    .filter((e) => {
      if (e.bucket) {
        return ['pre-70s', '70s', '80s', '90s'].includes(e.bucket);
      }
      return e.decade != null && e.decade < 2000;
    })
    .reduce((sum, e) => sum + e.share, 0);
}

export function get2010sPlusShare(eraDistribution: EraDecade[]): number {
  return eraDistribution
    .filter((e) => {
      if (e.bucket) {
        return ['10s', '20s'].includes(e.bucket);
      }
      return e.decade != null && e.decade >= 2010;
    })
    .reduce((sum, e) => sum + e.share, 0);
}

export function getActiveErasCount(eraDistribution: EraDecade[]): number {
  return eraDistribution.filter((e) => (e.count > 0 || e.share > 0) && e.bucket !== 'unknown')
    .length;
}

export function getMaxSingleEraShare(eraDistribution: EraDecade[]): number {
  const knownEras = eraDistribution.filter((e) => e.bucket !== 'unknown');
  if (knownEras.length === 0) return 0;
  return Math.max(...knownEras.map((e) => e.share));
}

// ── Prototype Classifier ──────────────────────────────────────────────────────

interface CandidateScore {
  id: PrototypeId;
  margin: number;
  priority: number;
}

/**
 * Classifies a user's concert data into one of the 10 prototypes with deterministic tie-breaking.
 */
export function computePrototype(data: MusicIdentityData): Prototype {
  if (data.shows < MIN_SHOWS_FOR_PROTOTYPE) {
    const meta = PROTOTYPE_METADATA.emerging_taste;
    return {
      id: 'emerging_taste',
      title: meta.title,
      tagline: meta.tagline,
      traits: meta.traits,
      accentColor: meta.accentColor,
      confidence: Math.round((data.shows / MIN_SHOWS_FOR_PROTOTYPE) * 100),
      runnerUp: null,
    };
  }

  const pre2000Share = getPre2000sShare(data.era_distribution);
  const post2010Share = get2010sPlusShare(data.era_distribution);
  const activeEras = getActiveErasCount(data.era_distribution);
  const maxEraShare = getMaxSingleEraShare(data.era_distribution);

  // Normalize repeat_artist_ratio to 0–100 scale if provided as 0–1 fraction
  const repeatRatio =
    data.repeat_artist_ratio <= 1 && data.repeat_artist_ratio > 0
      ? data.repeat_artist_ratio * 100
      : data.repeat_artist_ratio;

  // New artists share (0–100 scale)
  const newArtistShare =
    data.share_of_new_artists <= 1 && data.share_of_new_artists > 0
      ? data.share_of_new_artists * 100
      : data.share_of_new_artists;

  // Genre distribution metrics
  const activeGenres = Object.entries(data.genre_distribution).filter(
    ([g, entry]) => g !== 'unclassified' && g !== 'other' && entry.count > 0,
  );
  const genreCount = activeGenres.length;
  const maxGenreShare =
    activeGenres.length > 0 ? Math.max(...activeGenres.map(([, e]) => e.share)) : 0;

  // Venue distribution metrics
  const clubShare = data.venue_distribution.concert_hall_club?.share ?? 0;
  const stadiumShare =
    (data.venue_distribution.stadium?.share ?? 0) +
    (data.venue_distribution.indoor_arena?.share ?? 0) +
    (data.venue_distribution.festival?.share ?? 0);

  const candidates: CandidateScore[] = [];

  // 1. The Vault: >=50% shows from pre-2000s
  if (pre2000Share >= THRESHOLDS.vaultPre2000Share) {
    candidates.push({
      id: 'the_vault',
      margin: pre2000Share - THRESHOLDS.vaultPre2000Share,
      priority: 8,
    });
  }

  // 2. The Timeless: balanced across 3+ eras, no single era >40%
  if (
    pre2000Share < THRESHOLDS.vaultPre2000Share &&
    post2010Share < THRESHOLDS.modernist2010sShare &&
    activeEras >= THRESHOLDS.timelessMinActiveEras &&
    maxEraShare <= THRESHOLDS.timelessMaxSingleEraShare
  ) {
    candidates.push({
      id: 'the_timeless',
      margin:
        (THRESHOLDS.timelessMaxSingleEraShare - maxEraShare) +
        (activeEras - THRESHOLDS.timelessMinActiveEras) * 2,
      priority: 2,
    });
  }

  // 3. The Modernist: >=70% shows from 2010s+
  if (post2010Share >= THRESHOLDS.modernist2010sShare) {
    candidates.push({
      id: 'the_modernist',
      margin: post2010Share - THRESHOLDS.modernist2010sShare,
      priority: 7,
    });
  }

  // 4. The Pioneer: high share of newly-debuted artists (<5 yrs old)
  if (newArtistShare >= THRESHOLDS.pioneerNewArtistShare) {
    candidates.push({
      id: 'the_pioneer',
      margin: newArtistShare - THRESHOLDS.pioneerNewArtistShare,
      priority: 6,
    });
  }

  // 5. The Devotee: repeat_artist_ratio > 45% (or 0.45)
  if (repeatRatio > THRESHOLDS.devoteeRepeatRatio) {
    candidates.push({
      id: 'the_devotee',
      margin: repeatRatio - THRESHOLDS.devoteeRepeatRatio,
      priority: 9,
    });
  }

  // 6. The Omnivore: diversity score >= 80, >=4 macro-genres
  if (
    data.diversity_score >= THRESHOLDS.omnivoreDiversityScore &&
    genreCount >= THRESHOLDS.omnivoreMinGenres
  ) {
    candidates.push({
      id: 'the_omnivore',
      margin:
        data.diversity_score -
        THRESHOLDS.omnivoreDiversityScore +
        (genreCount - THRESHOLDS.omnivoreMinGenres) * 2,
      priority: 5,
    });
  }

  // 7. The Specialist: single genre > 60%
  if (maxGenreShare > THRESHOLDS.specialistGenreShare) {
    candidates.push({
      id: 'the_specialist',
      margin: maxGenreShare - THRESHOLDS.specialistGenreShare,
      priority: 10,
    });
  }

  // 8. The Club Rat: venue_type club/small > 70%
  if (clubShare > THRESHOLDS.clubRatVenueShare) {
    candidates.push({
      id: 'the_club_rat',
      margin: clubShare - THRESHOLDS.clubRatVenueShare,
      priority: 4,
    });
  }

  // 9. The Stadium Chaser: stadium/arena/festival > 70%
  if (stadiumShare > THRESHOLDS.stadiumChaserVenueShare) {
    candidates.push({
      id: 'the_stadium_chaser',
      margin: stadiumShare - THRESHOLDS.stadiumChaserVenueShare,
      priority: 3,
    });
  }

  // Deterministic sorting: highest margin first, then highest priority
  candidates.sort((a, b) => {
    if (Math.abs(b.margin - a.margin) > 0.01) {
      return b.margin - a.margin;
    }
    return b.priority - a.priority;
  });

  const winnerId = candidates[0]?.id ?? 'eclectic_listener';
  const runnerUpCandidate = candidates[1];
  const runnerUp = runnerUpCandidate
    ? {
        id: runnerUpCandidate.id,
        title: PROTOTYPE_METADATA[runnerUpCandidate.id].title,
      }
    : null;

  const meta = PROTOTYPE_METADATA[winnerId];
  const confidence = candidates[0]
    ? Math.min(98, Math.max(60, Math.round(50 + candidates[0].margin)))
    : 70;

  return {
    id: winnerId,
    title: meta.title,
    tagline: meta.tagline,
    traits: meta.traits,
    accentColor: meta.accentColor,
    confidence,
    runnerUp,
  };
}

// ── Musical Age ───────────────────────────────────────────────────────────────

export function computeMusicalAge(params: {
  rawMusicalAge?: number | null;
  showsWithKnownEra?: number;
  birthYear?: number | null;
}): MusicalAge | null {
  const { rawMusicalAge, showsWithKnownEra = 3, birthYear } = params;

  if (rawMusicalAge == null || showsWithKnownEra < MIN_SHOWS_WITH_ERA_FOR_MUSICAL_AGE) {
    return null;
  }

  const year = Math.round(rawMusicalAge);
  let differenceFromBirthYear: number | null = null;
  let formattedText = `Musical age: ${year}`;

  if (birthYear && birthYear > 1900 && birthYear <= new Date().getFullYear()) {
    differenceFromBirthYear = year - birthYear;
    if (differenceFromBirthYear > 0) {
      formattedText = `+${differenceFromBirthYear} years vs your birth year`;
    } else if (differenceFromBirthYear < 0) {
      formattedText = `${differenceFromBirthYear} years vs your birth year`;
    } else {
      formattedText = `Matches your birth year (${birthYear})`;
    }
  }

  const sublabel = "Weighted average debut year of artists you've seen live";

  return {
    year,
    differenceFromBirthYear,
    formattedText,
    sublabel,
  };
}

// ── Era Label ─────────────────────────────────────────────────────────────────

const MACRO_GENRE_NAMES: Record<string, string> = {
  rock: 'Rock',
  indie: 'Indie',
  pop: 'Pop',
  electronic: 'Electronic',
  hip_hop: 'Hip-Hop',
  rnb_soul: 'R&B/Soul',
  metal: 'Metal',
  punk: 'Punk',
  folk_acoustic: 'Folk',
  jazz_blues: 'Jazz',
  latin: 'Latin',
  classical: 'Classical',
  world: 'World',
};

export function computeEraLabel(
  eraDistribution: EraDecade[],
  genreDistribution: Record<string, { count: number; share: number }>,
): string {
  // Find top era with highest share/count (excluding unknown)
  const knownEras = eraDistribution
    .filter((e) => e.bucket !== 'unknown' && (e.count > 0 || e.share > 0))
    .sort((a, b) => b.share - a.share);

  const topEra = knownEras[0];

  // Find top macro-genre with highest count/share
  const knownGenres = Object.entries(genreDistribution)
    .filter(([g, e]) => g !== 'unclassified' && g !== 'other' && e.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  const topGenre = knownGenres[0]?.[0];
  const genreLabel = topGenre ? MACRO_GENRE_NAMES[topGenre] ?? topGenre : null;

  if (!topEra && !genreLabel) {
    return 'Eclectic Mix';
  }

  const eraBucket = topEra?.bucket ?? (topEra?.decade ? `${String(topEra.decade).slice(-2)}s` : null);

  // Curated flavor combinations
  if (eraBucket === '90s' && topGenre === 'rock') {
    return '90s Alt-Rock leaning';
  }
  if ((eraBucket === '90s' || eraBucket === '80s') && topGenre === 'hip_hop') {
    return 'Golden-era Hip-Hop';
  }
  if ((eraBucket === '20s' || eraBucket === '10s') && topGenre === 'electronic') {
    return 'Contemporary Electronic';
  }
  if (eraBucket === '70s' && topGenre === 'rock') {
    return 'Classic 70s Rock';
  }
  if (eraBucket === '80s' && topGenre === 'pop') {
    return '80s Retro-Pop';
  }
  if (eraBucket === '00s' && topGenre === 'indie') {
    return '2000s Indie Revival';
  }

  // Standard era prefix
  let eraPrefix = '';
  if (eraBucket === 'pre-70s') eraPrefix = 'Golden-era';
  else if (eraBucket === '70s') eraPrefix = '70s';
  else if (eraBucket === '80s') eraPrefix = '80s';
  else if (eraBucket === '90s') eraPrefix = '90s';
  else if (eraBucket === '00s') eraPrefix = '2000s';
  else if (eraBucket === '10s') eraPrefix = '2010s';
  else if (eraBucket === '20s') eraPrefix = 'Contemporary';
  else if (topEra?.decade) eraPrefix = `${topEra.decade}s`;

  if (eraPrefix && genreLabel) {
    return `${eraPrefix} ${genreLabel} leaning`;
  }
  if (eraPrefix) {
    return `${eraPrefix} Leaning`;
  }
  if (genreLabel) {
    return `${genreLabel} Focused`;
  }

  return 'Eclectic Mix';
}

// ── Master compute function ───────────────────────────────────────────────────

export function computeIdentity(
  data: MusicIdentityData,
  birthYear?: number | null,
): ComputedIdentity {
  const thinShowData = data.shows < MIN_SHOWS_FOR_PROTOTYPE;
  const knownEraArtists = data.era_coverage?.known_artists ?? 0;
  const thinEraData = (data.era_coverage?.percentage ?? 0) < 30 || knownEraArtists < 3;

  const rawAge = data.musical_age ?? data.weighted_median_begin_year;
  const musicalAge = computeMusicalAge({
    rawMusicalAge: rawAge,
    showsWithKnownEra: knownEraArtists,
    birthYear,
  });

  const eraLabel = computeEraLabel(data.era_distribution, data.genre_distribution);
  const prototype = computePrototype(data);
  const showsNeededForPrototype = Math.max(0, MIN_SHOWS_FOR_PROTOTYPE - data.shows);

  return {
    musicalAge,
    eraLabel,
    prototype,
    thinEraData,
    thinShowData,
    showsNeededForPrototype,
  };
}
