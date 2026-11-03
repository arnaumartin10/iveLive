const ENGLISH_WORDS = new Set(
  'a an and are as at be been being best born british but by can english for formed from had has have he her his in is it its known music musician of on or rock singer the their there they this to was were with who which'.split(
    ' ',
  ),
);

const NON_ENGLISH_WORDS = new Set(
  'amb així com dels des doncs el els en és aquesta aquest la les més molt no per però que seva sobre una un uns unes i y los las del desde fue son para por como está están'.split(
    ' ',
  ),
);

export function stripBioMarkup(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isEnglishBio(value: string | null | undefined): boolean {
  const words =
    value?.toLocaleLowerCase('en').match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  if (words.length < 4) return false;

  let englishEvidence = 0;
  let nonEnglishEvidence = 0;
  for (const word of words) {
    if (ENGLISH_WORDS.has(word)) englishEvidence += 1;
    if (NON_ENGLISH_WORDS.has(word)) nonEnglishEvidence += 1;
  }
  return (
    englishEvidence >= 2 &&
    englishEvidence > nonEnglishEvidence &&
    (words.length < 6 || englishEvidence >= 3)
  );
}
