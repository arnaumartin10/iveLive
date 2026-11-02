import { parseSetlistFmEmbed } from './setlistfmEmbed';
import type { ParsedSetlistFmEmbed } from './setlistfmEmbed';

export type SetlistSource = 'setlistfm' | 'text' | 'json' | 'csv' | 'manual';

export type ParsedSetlistSong = {
  title: string;
  setName: string | null;
  encore: boolean;
  medal?: SongMedal | null;
};

export type SongMedal = 'gold' | 'silver' | 'bronze';

export type ParsedSetlist = {
  artist: string | null;
  venue: string | null;
  city: string | null;
  eventDate: string | null;
  eventYear: number | null;
  source: SetlistSource;
  sourceUrl: string | null;
  setlistId: string | null;
  songs: ParsedSetlistSong[];
};

export type SetlistFormatDetection =
  | { format: 'setlistfm'; embed: ParsedSetlistFmEmbed }
  | { format: 'json'; setlist: ParsedSetlist }
  | { format: 'csv'; setlist: ParsedSetlist }
  | { format: 'text'; setlist: ParsedSetlist };

export function detectAndParseSetlist(input: string): SetlistFormatDetection {
  const trimmed = input.trim();
  if (!trimmed)
    throw new Error('Paste a setlist or choose a file to get started.');

  if (/^\[url\s*=/i.test(trimmed)) {
    const bbcode = parseSetlistFmEmbed(trimmed);
    if (bbcode) return { format: 'setlistfm', embed: bbcode };
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return {
        format: 'json',
        setlist: parseSetlistJson(JSON.parse(trimmed) as unknown),
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          'That JSON file could not be read. Check its format and try again.',
        );
      }
      throw error;
    }
  }
  if (looksLikeCsv(trimmed) && !/<(?:a|img|div)\b/i.test(trimmed)) {
    return { format: 'csv', setlist: parseSetlistCsv(trimmed) };
  }
  const embed = parseSetlistFmEmbed(trimmed);
  if (embed) return { format: 'setlistfm', embed };
  if (containsSetlistFmLink(trimmed)) {
    throw new Error(
      'That setlist.fm link is not a setlist page. Paste the event page or its embed instead.',
    );
  }
  if (/<[a-z!/?][^>]*>/i.test(trimmed)) {
    throw new Error(
      'That embed is not a setlist.fm setlist. Paste the event page or its embed instead.',
    );
  }
  return { format: 'text', setlist: parseSetlistText(trimmed) };
}

export function parseSetlistJson(payload: unknown): ParsedSetlist {
  if (!isRecord(payload)) {
    if (Array.isArray(payload)) {
      return {
        artist: null,
        venue: null,
        city: null,
        eventDate: null,
        eventYear: null,
        source: 'json',
        sourceUrl: null,
        setlistId: null,
        songs: parseSongArray(payload, null),
      };
    }
    throw new Error('The JSON should contain a list of songs.');
  }

  const artist =
    recordString(payload.artist, 'name') ?? stringValue(payload.artist);
  const venueRecord = isRecord(payload.venue) ? payload.venue : null;
  const cityRecord =
    venueRecord && isRecord(venueRecord.city) ? venueRecord.city : null;
  const setsRecord = isRecord(payload.sets) ? payload.sets : null;
  const rawSets = Array.isArray(payload.set)
    ? payload.set
    : Array.isArray(setsRecord?.set)
      ? setsRecord.set
      : isRecord(setsRecord?.set)
        ? [setsRecord.set]
        : null;
  const songs = rawSets
    ? rawSets.flatMap((set) => {
        if (!isRecord(set)) return [];
        return parseSongArray(
          set.song,
          stringValue(set.name),
          isEncore(set.encore),
        );
      })
    : parseSongArray(payload.songs ?? payload.song, null);
  if (!songs.length) throw new Error('No song titles were found in that JSON.');

  const eventDate = parseSetlistFmDate(stringValue(payload.eventDate));
  return {
    artist,
    venue: stringValue(venueRecord?.name),
    city: stringValue(cityRecord?.name),
    eventDate,
    eventYear: eventDate
      ? Number(eventDate.slice(0, 4))
      : typeof payload.eventYear === 'number'
        ? payload.eventYear
        : null,
    source: 'json',
    sourceUrl: safeHttpUrl(stringValue(payload.url)),
    setlistId: stringValue(payload.id),
    songs,
  };
}

export function parseSetlistText(input: string): ParsedSetlist {
  let currentSet: string | null = null;
  const songs: ParsedSetlistSong[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const header = /^(set\s*\d+|encore\s*\d*|encore)$/i.exec(line);
    if (header) {
      currentSet = header[0];
      continue;
    }
    const title = line.replace(/^\d{1,3}\s*[.)-]\s*/, '').trim();
    if (title) {
      songs.push({
        title,
        setName: currentSet,
        encore: /^encore/i.test(currentSet ?? ''),
      });
    }
  }
  if (!songs.length)
    throw new Error('No song titles found. Paste one song per line.');
  return emptySetlist('text', songs);
}

export function parseSetlistCsv(input: string): ParsedSetlist {
  const rows = parseCsvRows(input);
  if (!rows.length) throw new Error('No songs found in that CSV file.');
  const header = rows[0]?.map((cell) => cell.trim().toLowerCase()) ?? [];
  const hasHeader = header.some((cell) =>
    ['song', 'title', 'track', 'set', 'set name'].includes(cell),
  );
  const titleIndex = hasHeader
    ? Math.max(
        0,
        header.findIndex((cell) => ['song', 'title', 'track'].includes(cell)),
      )
    : 0;
  const setIndex = hasHeader
    ? header.findIndex((cell) => ['set', 'set name'].includes(cell))
    : -1;
  const songs = rows
    .slice(hasHeader ? 1 : 0)
    .map((row) => ({
      title: (row[titleIndex] ?? '').trim(),
      setName: setIndex >= 0 ? row[setIndex]?.trim() || null : null,
      encore: setIndex >= 0 ? /^encore/i.test(row[setIndex] ?? '') : false,
    }))
    .filter((song) => song.title);
  if (!songs.length)
    throw new Error(
      'No song titles found. Add a title column or use one song per row.',
    );
  return emptySetlist('csv', songs);
}

export function setlistFmResponseToParsed(
  payload: unknown,
  fallback: ParsedSetlistFmEmbed,
): ParsedSetlist {
  if (!isRecord(payload))
    throw new Error('Setlist.fm returned an unreadable setlist.');
  const parsed = parseSetlistJson(payload);
  return {
    ...parsed,
    source: 'setlistfm',
    sourceUrl: safeHttpUrl(stringValue(payload.url)) ?? fallback.sourceUrl,
    setlistId: stringValue(payload.id) ?? fallback.setlistId,
    artist: parsed.artist ?? fallback.eventHint.artist,
    venue: parsed.venue ?? fallback.eventHint.venue,
    city: parsed.city ?? fallback.eventHint.city,
    eventYear: parsed.eventYear ?? fallback.eventHint.year,
  };
}

export function parseSetlistFmDate(value: string | null): string | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value ?? '');
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseSongArray(
  value: unknown,
  setName: string | null,
  isEncore = false,
): ParsedSetlistSong[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const title =
      typeof item === 'string'
        ? item.trim()
        : isRecord(item)
          ? (stringValue(item.name) ?? stringValue(item.title) ?? '')
          : '';
    if (!title) return [];
    return [
      {
        title,
        setName,
        encore: isEncore,
      },
    ];
  });
}

function isEncore(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function emptySetlist(
  source: 'text' | 'csv',
  songs: ParsedSetlistSong[],
): ParsedSetlist {
  return {
    artist: null,
    venue: null,
    city: null,
    eventDate: null,
    eventYear: null,
    source,
    sourceUrl: null,
    setlistId: null,
    songs,
  };
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && quoted && input[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((entry) => entry.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char ?? '';
    }
  }
  row.push(cell);
  if (row.some((entry) => entry.trim())) rows.push(row);
  if (quoted) throw new Error('That CSV has an unfinished quoted field.');
  return rows;
}

function looksLikeCsv(input: string): boolean {
  const lines = input.split(/\r?\n/).filter(Boolean);
  return lines.length > 1 && lines[0]?.includes(',') === true;
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'www.setlist.fm' || url.hostname === 'setlist.fm')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function containsSetlistFmLink(value: string): boolean {
  const safeText = value
    .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  for (const match of safeText.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    try {
      const url = new URL(match[0].replace(/[),.;\]}]+$/, ''));
      if (url.hostname === 'www.setlist.fm' || url.hostname === 'setlist.fm') {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function recordString(value: unknown, key: string): string | null {
  return isRecord(value) ? stringValue(value[key]) : null;
}
