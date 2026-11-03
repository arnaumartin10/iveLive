import { isEnglishBio, stripBioMarkup } from './language.ts';

export type BioPatch = {
  bio: string | null;
  bio_source: string | null;
  bio_url: string | null;
  bio_lang: 'en';
  bio_attribution: string | null;
  wikipedia_title: string | null;
};

const BIO_FIELDS = new Set([
  'bio',
  'bio_source',
  'bio_url',
  'bio_lang',
  'bio_attribution',
  'wikipedia_title',
]);

export function isBioField(field: string): boolean {
  return BIO_FIELDS.has(field);
}

export function selectEnglishBio(
  existing: { bio_source?: string | null; user_edited_fields?: string[] },
  candidates: { provider: string; patch?: Record<string, unknown> }[],
  englishWikipediaTitle: string | null = null,
): BioPatch | null {
  if (
    existing.bio_source === 'manual' ||
    existing.user_edited_fields?.includes('bio')
  ) {
    return null;
  }

  const priority = ['wikipedia', 'lastfm', 'theaudiodb'];
  for (const provider of priority) {
    const entry = candidates.find((entry) => entry.provider === provider);
    const candidate = entry?.patch;
    if (!candidate) continue;
    const text =
      typeof candidate?.bio === 'string' ? stripBioMarkup(candidate.bio) : '';
    if (!text || !isEnglishBio(text)) continue;
    const url =
      typeof candidate.bio_url === 'string' && candidate.bio_url.trim()
        ? candidate.bio_url.trim()
        : null;
    if (!url) continue;

    return {
      bio: text,
      bio_source: provider,
      bio_url: url,
      bio_lang: 'en',
      bio_attribution:
        provider === 'wikipedia'
          ? 'CC BY-SA'
          : typeof candidate.bio_attribution === 'string'
            ? candidate.bio_attribution
            : null,
      wikipedia_title:
        provider === 'wikipedia' &&
        typeof candidate.wikipedia_title === 'string'
          ? candidate.wikipedia_title
          : englishWikipediaTitle,
    };
  }

  return {
    bio: null,
    bio_source: null,
    bio_url: null,
    bio_lang: 'en',
    bio_attribution: null,
    wikipedia_title: englishWikipediaTitle,
  };
}
