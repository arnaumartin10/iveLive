import { MACRO_GENRES } from '../genres/macroGenres';
import { RAW } from '../../theme/palette';
import { VENUE_TYPES, type VenueType } from '../venues/venueTypes';
import {
  computeBadges,
  getConcertArchetype,
  largestRemainder,
} from '../stats/analytics';
import type {
  GenreStat,
  StatsOverview,
  StatsScope,
  VenueStat,
} from '../stats/types';

export type WrappedSlideId =
  | 'intro'
  | 'total'
  | 'top-artist'
  | 'top-artists'
  | 'genres'
  | 'venues'
  | 'month'
  | 'records'
  | 'taste'
  | 'ratings'
  | 'wall-of-fame'
  | 'badges'
  | 'outro';

export type WrappedArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
  avgRating: number | null;
};

export type WrappedData = {
  year: StatsScope;
  slides: WrappedSlideId[];
  totalShows: number;
  uniqueArtists: number;
  uniqueVenues: number;
  topArtist: WrappedArtist | null;
  topArtists: WrappedArtist[];
  topGenres: {
    slug: string;
    label: string;
    color: string;
    count: number;
    percentage: number;
  }[];
  venueMix: {
    type: VenueType;
    label: string;
    color: string;
    count: number;
    percentage: number;
    icon: (typeof VENUE_TYPES)[VenueType]['icon'];
  }[];
  mostVisitedVenue: {
    name: string;
    count: number;
    type: VenueType | null;
  } | null;
  busiestMonth: { month: number; count: number } | null;
  busiestWeekday: { weekday: number; count: number } | null;
  showsByMonth: number[];
  longestStreakWeeks: number;
  longestGapDays: number;
  mostShowsInOneWeek: number;
  tasteScore: number;
  dominantGenre: { slug: string; label: string; percentage: number } | null;
  personality: { title: string; description: string };
  averageRating: number | null;
  ratingHistogram: number[];
  ratingCount: number;
  ratingLabel: 'Harsh critic' | 'Balanced' | 'Generous' | null;
  fiveStarCount: number;
  earnedBadges: string[];
  genreColors: string[];
};

function getTasteScore(genres: GenreStat[]) {
  const counts = genres
    .map((genre) => genre.log_count)
    .filter((count) => count > 0);
  if (counts.length < 2) return 0;
  const total = counts.reduce((sum, count) => sum + count, 0);
  const entropy = counts.reduce((sum, count) => {
    const share = count / total;
    return sum - share * Math.log(share);
  }, 0);
  return Math.round((entropy / Math.log(counts.length)) * 100);
}

function toWrappedArtist(
  artist: StatsOverview['top_artists_by_count'][number],
): WrappedArtist {
  return {
    id: artist.artist_id,
    name: artist.artist,
    imageUrl: artist.image_url ?? null,
    count: artist.count,
    firstSeen: artist.first_seen ?? null,
    lastSeen: artist.last_seen ?? null,
    avgRating: artist.avg_rating ?? null,
  };
}

export function buildWrappedData(
  stats: StatsOverview,
  genres: GenreStat[],
  venues: VenueStat[],
  year: StatsScope = null,
): WrappedData {
  const sortedGenres = [...genres]
    .filter((genre) => genre.log_count > 0 && genre.macro_genre !== 'unclassified')
    .sort(
      (left, right) =>
        right.log_count - left.log_count ||
        left.macro_genre.localeCompare(right.macro_genre),
    );
  const topThree = sortedGenres.slice(0, 3);
  const genrePercentages = largestRemainder(
    topThree.map((genre) => genre.log_count),
  );
  const topGenres = topThree.map((genre, index) => {
    const config = MACRO_GENRES[genre.macro_genre as keyof typeof MACRO_GENRES];
    return {
      slug: genre.macro_genre,
      label: config?.label ?? genre.macro_genre,
      color: config?.color ?? RAW.mauve,
      count: genre.log_count,
      percentage: genrePercentages[index] ?? 0,
    };
  });

  const sortedVenues = [...venues]
    .filter((venue) => venue.log_count > 0)
    .sort(
      (left, right) =>
        right.log_count - left.log_count ||
        left.venue_type.localeCompare(right.venue_type),
    );
  const venuePercentages = largestRemainder(
    sortedVenues.map((venue) => venue.log_count),
  );
  const venueMix = sortedVenues.map((venue, index) => {
    const config = VENUE_TYPES[venue.venue_type];
    return {
      type: venue.venue_type,
      label: config.shortLabel,
      color: config.primaryColor,
      count: venue.log_count,
      percentage: venuePercentages[index] ?? 0,
      icon: config.icon,
    };
  });

  const topArtists = stats.top_artists_by_count
    .slice(0, 5)
    .map(toWrappedArtist);
  const topArtist = topArtists[0] ?? null;
  const topVenue = stats.top_venues_by_name[0];
  const tasteScore = getTasteScore(sortedGenres);
  const totalGenreLogs = sortedGenres.reduce(
    (sum, genre) => sum + genre.log_count,
    0,
  );
  const dominant = sortedGenres[0];
  const dominantGenre = dominant
    ? {
        slug: dominant.macro_genre,
        label:
          MACRO_GENRES[dominant.macro_genre as keyof typeof MACRO_GENRES]
            ?.label ?? dominant.macro_genre,
        percentage: totalGenreLogs
          ? Math.round((dominant.log_count / totalGenreLogs) * 100)
          : 0,
      }
    : null;
  const venueCounts = Object.fromEntries(
    venues.map((venue) => [venue.venue_type, venue.log_count]),
  );
  const personality = getConcertArchetype(venueCounts, tasteScore);
  const badges = computeBadges({
    total_shows: stats.total_shows,
    five_star_count: stats.five_star_count,
    active_years: stats.active_years,
    genre_count: genres.length,
    venue_counts: venueCounts,
  });
  const ratingCount = stats.rating_histogram.reduce(
    (sum, bucket) => sum + bucket.count,
    0,
  );
  const ratingLabel =
    stats.avg_rating == null
      ? null
      : stats.avg_rating < 3
        ? 'Harsh critic'
        : stats.avg_rating < 4
          ? 'Balanced'
          : 'Generous';

  const slides: WrappedSlideId[] = ['intro'];
  if (stats.total_shows > 0) slides.push('total');
  if (topArtist && topArtist.count >= 2) slides.push('top-artist');
  if (topArtists.length >= 2) slides.push('top-artists');
  if (topGenres.length > 0 && stats.total_shows >= 3) slides.push('genres');
  if (venueMix.length > 0 && stats.total_shows >= 3) slides.push('venues');
  if (
    stats.total_shows >= 3 &&
    stats.busiest_month &&
    stats.busiest_month.count >= 2
  )
    slides.push('month');
  if (
    stats.total_shows >= 3 &&
    (stats.longest_streak_weeks > 1 ||
      stats.longest_gap_days > 0 ||
      stats.most_shows_in_one_week > 1)
  )
    slides.push('records');
  if (stats.total_shows >= 3 && topGenres.length > 0) slides.push('taste');
  if (ratingCount >= 2) slides.push('ratings');
  if (stats.five_star_count > 0) slides.push('wall-of-fame');
  const earnedBadges = badges
    .filter((badge) => badge.earned)
    .map((badge) => badge.title);
  if (earnedBadges.length > 0) slides.push('badges');
  slides.push('outro');

  return {
    year,
    slides,
    totalShows: stats.total_shows,
    uniqueArtists: stats.unique_artists,
    uniqueVenues: stats.unique_venues,
    topArtist,
    topArtists,
    topGenres,
    venueMix,
    mostVisitedVenue: topVenue
      ? {
          name: topVenue.name,
          count: topVenue.count,
          type: topVenue.venue_type,
        }
      : stats.most_visited_venue
        ? { ...stats.most_visited_venue, type: null }
        : null,
    busiestMonth: stats.busiest_month,
    busiestWeekday: stats.busiest_weekday,
    showsByMonth: stats.shows_by_month.map((bucket) => bucket.count),
    longestStreakWeeks: stats.longest_streak_weeks,
    longestGapDays: stats.longest_gap_days,
    mostShowsInOneWeek: stats.most_shows_in_one_week,
    tasteScore,
    dominantGenre,
    personality,
    averageRating: stats.avg_rating,
    ratingHistogram: stats.rating_histogram.map((bucket) => bucket.count),
    ratingCount,
    ratingLabel,
    fiveStarCount: stats.five_star_count,
    earnedBadges,
    genreColors: topGenres.map((genre) => genre.color),
  };
}
