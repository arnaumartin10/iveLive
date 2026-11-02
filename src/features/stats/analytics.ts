export type Insight = {
  id: string;
  text: string;
  priority: number;
};

export type InsightStats = {
  total_shows: number;
  busiest_month?: { month: number; count: number } | null;
  most_seen_artist?: { artist: string; count: number } | null;
  longest_streak_weeks?: number;
  rating_by_venue_type?: { venue_type: string; avg_rating: number | null }[];
};

export type BadgeStats = {
  total_shows: number;
  five_star_count: number;
  active_years: number;
  genre_count: number;
  venue_counts: Record<string, number>;
};

export type Badge = {
  id: string;
  title: string;
  progress: number;
  target: number;
  earned: boolean;
};

export type Archetype = { title: string; description: string };

export function largestRemainder(values: number[], total = 100): number[] {
  if (values.length === 0) return [];
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError('total must be a non-negative integer');
  }

  const weights = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const sum = weights.reduce((accumulator, value) => accumulator + value, 0);
  if (sum === 0)
    return weights.map((_value, index) => (index === 0 ? total : 0));

  const quotas = weights.map((value) => (value / sum) * total);
  const result = quotas.map(Math.floor);
  let remaining =
    total - result.reduce((accumulator, value) => accumulator + value, 0);
  const order = quotas
    .map((quota, index) => ({ index, remainder: quota - Math.floor(quota) }))
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.index - right.index,
    );

  for (let index = 0; index < remaining; index += 1) {
    const item = order[index];
    if (item) result[item.index] = (result[item.index] ?? 0) + 1;
  }
  return result;
}

export function genreSharesExcludingUnclassified(
  values: number[],
  genres: string[],
): number[] {
  const includedIndexes = genres.flatMap((genre, index) =>
    genre === 'unclassified' ? [] : [index],
  );
  if (includedIndexes.length === 0) return values.map(() => 0);
  const shares = largestRemainder(
    includedIndexes.map((index) => values[index] ?? 0),
  );
  return values.map((_value, index) => {
    const includedIndex = includedIndexes.indexOf(index);
    return includedIndex < 0 ? 0 : (shares[includedIndex] ?? 0);
  });
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function buildInsights(stats: InsightStats): Insight[] {
  if (stats.total_shows < 3) return [];

  const insights: Insight[] = [];
  const busyMonth = stats.busiest_month;
  if (busyMonth && busyMonth.count >= 2) {
    const month = MONTHS[busyMonth.month - 1];
    if (month) {
      insights.push({
        id: 'busiest-month',
        text: `${month} was your busiest month: ${busyMonth.count} shows`,
        priority: 80,
      });
    }
  }

  const artist = stats.most_seen_artist;
  if (artist && artist.count >= 2) {
    insights.push({
      id: 'most-seen-artist',
      text: `You have seen ${artist.artist} ${artist.count} times`,
      priority: 90,
    });
  }

  if ((stats.longest_streak_weeks ?? 0) >= 2) {
    insights.push({
      id: 'longest-streak',
      text: `Your longest streak: ${stats.longest_streak_weeks} weeks in a row`,
      priority: 70,
    });
  }

  const venueRatings = (stats.rating_by_venue_type ?? [])
    .filter((item) => item.avg_rating != null)
    .sort((left, right) => (right.avg_rating ?? 0) - (left.avg_rating ?? 0));
  const [best, second] = venueRatings;
  if (
    best?.avg_rating != null &&
    second?.avg_rating != null &&
    venueRatings.length >= 2
  ) {
    insights.push({
      id: 'venue-rating-difference',
      text: `You rate ${best.venue_type.replaceAll('_', ' ')} shows highest`,
      priority: 50,
    });
  }

  return insights
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 6);
}

export function computeBadges(stats: BadgeStats): Badge[] {
  const milestone = [10, 25, 50, 100, 250].map((target) => ({
    id: `shows-${target}`,
    title: `${target} shows`,
    progress: Math.min(stats.total_shows, target),
    target,
    earned: stats.total_shows >= target,
  }));
  return [
    ...milestone,
    {
      id: 'first-festival',
      title: 'First Festival',
      progress: Math.min(stats.venue_counts.festival ?? 0, 1),
      target: 1,
      earned: (stats.venue_counts.festival ?? 0) >= 1,
    },
    {
      id: 'festival-five',
      title: 'Festival Regular',
      progress: Math.min(stats.venue_counts.festival ?? 0, 5),
      target: 5,
      earned: (stats.venue_counts.festival ?? 0) >= 5,
    },
    {
      id: 'festa-major-regular',
      title: 'Festa Major Regular',
      progress: Math.min(stats.venue_counts.festa_major ?? 0, 5),
      target: 5,
      earned: (stats.venue_counts.festa_major ?? 0) >= 5,
    },
    {
      id: 'stadium-veteran',
      title: 'Stadium Veteran',
      progress: Math.min(stats.venue_counts.stadium ?? 0, 5),
      target: 5,
      earned: (stats.venue_counts.stadium ?? 0) >= 5,
    },
    {
      id: 'club-rat',
      title: 'Club Rat',
      progress: Math.min(stats.venue_counts.concert_hall_club ?? 0, 25),
      target: 25,
      earned: (stats.venue_counts.concert_hall_club ?? 0) >= 25,
    },
    {
      id: 'ten-year-veteran',
      title: '10-Year Veteran',
      progress: Math.min(stats.active_years, 10),
      target: 10,
      earned: stats.active_years >= 10,
    },
    {
      id: 'five-star-collector',
      title: '5-Star Collector',
      progress: Math.min(stats.five_star_count, 10),
      target: 10,
      earned: stats.five_star_count >= 10,
    },
    {
      id: 'genre-hopper',
      title: 'Genre Hopper',
      progress: Math.min(stats.genre_count, 5),
      target: 5,
      earned: stats.genre_count >= 5,
    },
    {
      id: 'completionist',
      title: 'Completionist',
      progress: Math.min(stats.genre_count, 14),
      target: 14,
      earned: stats.genre_count >= 14,
    },
  ];
}

export function getConcertArchetype(
  venueCounts: Record<string, number>,
  diversityScore: number,
): Archetype {
  if (diversityScore >= 70) {
    return {
      title: 'The Explorer',
      description: 'Your setlist crosses scenes, sounds, and surprises.',
    };
  }
  if ((venueCounts.festa_major ?? 0) >= 5) {
    return {
      title: 'The Local Hero',
      description: 'You show up for the music woven into your local scene.',
    };
  }
  const festival = venueCounts.festival ?? 0;
  const clubs = venueCounts.concert_hall_club ?? 0;
  const stadiums = venueCounts.stadium ?? 0;
  if (festival > clubs && festival > stadiums) {
    return {
      title: 'The Festival Nomad',
      description: 'You follow the music wherever the stages appear.',
    };
  }
  if (clubs > stadiums) {
    return {
      title: 'The Club Regular',
      description: 'You prefer close rooms, loud amps, and late nights.',
    };
  }
  if (stadiums > 0) {
    return {
      title: 'The Stadium Soul',
      description: 'Big voices and bigger nights are your kind of show.',
    };
  }
  return {
    title: 'The Live Music Lover',
    description: 'Every show adds another chapter to your story.',
  };
}
