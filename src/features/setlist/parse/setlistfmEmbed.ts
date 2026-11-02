export type SetlistEventHint = {
  artist: string | null;
  venue: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  year: number | null;
};

export type ParsedSetlistFmEmbed = {
  setlistId: string;
  sourceUrl: string | null;
  eventHint: SetlistEventHint;
  warnings: string[];
};

type Candidate = {
  id: string;
  kind: 'page' | 'widget' | 'edit';
  url: URL;
  artistSlug?: string;
  venueSlug?: string;
  year?: number;
};

const SETLIST_ID = /^[\da-f]{8}$/i;
const PAGE_PATH = /^\/setlist\/([^/]+)\/(\d{4})\/(.+)-([\da-f]{8})\.html$/i;

export function parseSetlistFmEmbed(
  pasted: string,
): ParsedSetlistFmEmbed | null {
  if (!pasted.trim()) return null;

  const safeMarkup = pasted
    .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  const candidates: Candidate[] = [];
  const hints: SetlistEventHint[] = [];

  for (const tag of safeMarkup.matchAll(/<(?:a|img)\b([^>]*)>/gi)) {
    const attributes = parseAttributes(tag[1] ?? '');
    for (const value of [attributes.title, attributes.alt]) {
      if (value) hints.push(parseEventHint(decodeEntities(value)));
    }
  }

  const rawUrls = new Set<string>();
  for (const match of safeMarkup.matchAll(/https?:\/\/[^\s"'<>]+/gi)) {
    rawUrls.add(
      decodeEntities(match[0])
        .replace(/\].*$/, '')
        .replace(/[),.;}]+$/, ''),
    );
  }

  for (const rawUrl of rawUrls) {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      continue;
    }
    const hostname = url.hostname.toLowerCase();
    if (
      hostname.includes('setlist.fm') &&
      (url.protocol !== 'https:' ||
        (hostname !== 'setlist.fm' && hostname !== 'www.setlist.fm'))
    ) {
      throw new Error(
        'Use a secure link from setlist.fm (www.setlist.fm or setlist.fm).',
      );
    }
    if (
      url.protocol !== 'https:' ||
      (hostname !== 'www.setlist.fm' && hostname !== 'setlist.fm')
    ) {
      continue;
    }

    const pageMatch = PAGE_PATH.exec(url.pathname);
    if (pageMatch?.[4]) {
      candidates.push({
        id: pageMatch[4].toLowerCase(),
        kind: 'page',
        url,
        artistSlug: pageMatch[1],
        year: Number(pageMatch[2]),
        venueSlug: pageMatch[3],
      });
      continue;
    }

    if (url.pathname === '/widgets/setlist-image-v1') {
      const id = url.searchParams.get('id');
      if (id && SETLIST_ID.test(id)) {
        candidates.push({ id: id.toLowerCase(), kind: 'widget', url });
      }
      continue;
    }

    if (url.pathname === '/edit') {
      const id = url.searchParams.get('setlist');
      if (id && SETLIST_ID.test(id)) {
        candidates.push({ id: id.toLowerCase(), kind: 'edit', url });
      }
    }
  }

  if (!candidates.length) return null;
  const page = candidates.find((candidate) => candidate.kind === 'page');
  const chosen =
    page ??
    candidates.find((candidate) => candidate.kind === 'edit') ??
    candidates[0];
  if (!chosen) return null;

  const warnings: string[] = [];
  if (new Set(candidates.map((candidate) => candidate.id)).size > 1) {
    warnings.push(
      'The pasted links contain different setlist IDs. The setlist page link was preferred.',
    );
  }

  const eventHint =
    hints
      .map((hint) => enrichHint(hint, chosen))
      .find((hint) => hint.artist || hint.venue) ?? hintFromSlug(chosen);
  const sourceCandidate = page ?? chosen;
  const sourceUrl =
    sourceCandidate.kind === 'edit'
      ? new URL(
          `/edit?setlist=${sourceCandidate.id}&step=song`,
          'https://www.setlist.fm',
        )
      : new URL(sourceCandidate.url);
  if (sourceCandidate.kind !== 'edit') {
    sourceUrl.search = '';
    sourceUrl.hash = '';
  }

  return {
    setlistId: page?.id ?? chosen.id,
    sourceUrl: sourceUrl.toString(),
    eventHint,
    warnings,
  };
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const expression = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of source.matchAll(expression)) {
    const name = match[1]?.toLowerCase();
    if (name === 'title' || name === 'alt') {
      attributes[name] = match[2] ?? match[3] ?? match[4] ?? '';
    }
  }
  return attributes;
}

function parseEventHint(value: string): SetlistEventHint {
  const empty: SetlistEventHint = {
    artist: null,
    venue: null,
    city: null,
    region: null,
    country: null,
    year: null,
  };
  const title = value.replace(/\s+/g, ' ').trim();
  const yearMatch = /(?:^|\s)(\d{4})$/.exec(title);
  const year = yearMatch?.[1] ? Number(yearMatch[1]) : null;
  const beforeYear = yearMatch ? title.slice(0, yearMatch.index).trim() : title;
  const marker = /\s+Setlist\s+/i.exec(beforeYear);
  if (!marker || marker.index === undefined) return { ...empty, year };

  const artist = beforeYear.slice(0, marker.index).trim() || null;
  const location = beforeYear.slice(marker.index + marker[0].length);
  const pieces = location
    .split(',')
    .map((piece) => piece.trim())
    .filter(Boolean);
  return {
    artist,
    venue: pieces[0] ?? null,
    city: pieces[1] ?? null,
    region: pieces[2] ?? null,
    country: pieces.slice(3).join(', ') || null,
    year,
  };
}

function enrichHint(
  hint: SetlistEventHint,
  candidate: Candidate,
): SetlistEventHint {
  const fallback = hintFromSlug(candidate);
  return {
    artist: hint.artist ?? fallback.artist,
    venue: hint.venue ?? fallback.venue,
    city: hint.city ?? fallback.city,
    region: hint.region ?? fallback.region,
    country: hint.country ?? fallback.country,
    year: hint.year ?? fallback.year,
  };
}

function hintFromSlug(candidate: Candidate): SetlistEventHint {
  return {
    artist: candidate.artistSlug ? humanizeSlug(candidate.artistSlug) : null,
    venue: candidate.venueSlug
      ? humanizeSlug(candidate.venueSlug.replace(/-[\da-f]{8}$/i, ''))
      : null,
    city: null,
    region: null,
    country: null,
    year: candidate.year ?? null,
  };
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}
