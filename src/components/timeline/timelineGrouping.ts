import {
  MACRO_GENRES,
  type MacroGenre,
} from '../../features/genres/macroGenres';
import type { ConcertWithRelations } from '../../features/concerts/types';

export type YearHeaderItem = {
  type: 'year-header';
  id: string;
  year: string;
};

export type MonthSubheaderItem = {
  type: 'month-header';
  id: string;
  year: string;
  month: string;
  monthKey: string;
};

export type LogTimelineItem = {
  type: 'log';
  id: string;
  concert: ConcertWithRelations;
  currentColor: string;
  adjacentColor: string;
  dayNumber: string;
  shortWeekday: string;
  primaryGenreName: string;
};

export type TimelineItem =
  YearHeaderItem | MonthSubheaderItem | LogTimelineItem;

const MONTH_NAMES = [
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getPrimaryGenreInfo(concert: ConcertWithRelations): {
  color: string;
  label: string;
  slug: MacroGenre;
} {
  const artist = concert.artist;
  const slug =
    artist?.primary_macro ||
    (artist?.macro_genres && artist.macro_genres.length > 0
      ? artist.macro_genres[0]
      : 'other') ||
    'other';

  const config = MACRO_GENRES[slug as MacroGenre] ?? MACRO_GENRES.other;

  return {
    color: config.color,
    label: config.label,
    slug: config.slug,
  };
}

export function buildTimelineItems(logs: ConcertWithRelations[]): {
  items: TimelineItem[];
  stickyHeaderIndices: number[];
} {
  const items: TimelineItem[] = [];
  const stickyHeaderIndices: number[] = [];

  let lastYear: string | null = null;
  let lastMonthKey: string | null = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (!log) continue;

    const dateStr = log.event_date; // YYYY-MM-DD
    const year = dateStr.slice(0, 4);
    const monthNum = parseInt(dateStr.slice(5, 7), 10);
    const dayNum = parseInt(dateStr.slice(8, 10), 10);
    const monthKey = dateStr.slice(0, 7);

    // Fast date calculation for weekday
    const dateObj = new Date(Number(year), monthNum - 1, dayNum);
    const shortWeekday = WEEKDAYS[dateObj.getDay()] ?? '';
    const dayNumber = String(dayNum);
    const monthName = MONTH_NAMES[monthNum - 1] ?? '';

    // Check year boundary
    if (year !== lastYear) {
      items.push({
        type: 'year-header',
        id: `year-${year}`,
        year,
      });
      stickyHeaderIndices.push(items.length - 1);
      lastYear = year;
      lastMonthKey = null;
    }

    // Check month boundary
    if (monthKey !== lastMonthKey) {
      items.push({
        type: 'month-header',
        id: `month-${monthKey}`,
        year,
        month: monthName,
        monthKey,
      });
      stickyHeaderIndices.push(items.length - 1);
      lastMonthKey = monthKey;
    }

    const { color: currentColor, label: primaryGenreName } =
      getPrimaryGenreInfo(log);

    // Adjacent color: genre color of the next log
    const nextLog = logs[i + 1];
    const adjacentColor = nextLog
      ? getPrimaryGenreInfo(nextLog).color
      : currentColor;

    items.push({
      type: 'log',
      id: log.id,
      concert: log,
      currentColor,
      adjacentColor,
      dayNumber,
      shortWeekday,
      primaryGenreName,
    });
  }

  return { items, stickyHeaderIndices };
}
