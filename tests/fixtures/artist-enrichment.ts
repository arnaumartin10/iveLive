export const musicBrainzSearchFixture = {
  artists: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Arctic Monkeys Live',
      score: 100,
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Arctic Monkeys',
      score: 88,
    },
  ],
};

export const musicBrainzArtistFixture = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Arctic Monkeys',
  tags: [
    { name: 'indie rock', count: 24 },
    { name: 'seen live', count: 19 },
  ],
  genres: [{ name: 'rock', count: 11 }],
  relations: [
    {
      type: 'wikidata',
      url: { resource: 'https://www.wikidata.org/wiki/Q484245' },
    },
    {
      type: 'wikipedia',
      url: { resource: 'https://en.wikipedia.org/wiki/Arctic_Monkeys' },
    },
  ],
  'release-groups': [
    {
      id: '00000000-0000-4000-8000-000000000003',
      title: 'AM',
      'first-release-date': '2013-09-09',
      'primary-type': 'Album',
      'secondary-types': [],
    },
  ],
};

export const lastFmTagsFixture = {
  toptags: {
    tag: [
      { name: 'indie', count: '100' },
      { name: 'british', count: '50' },
      { name: 'dream pop', count: '30' },
    ],
  },
};

export const lastFmInfoFixture = {
  artist: {
    bio: {
      summary:
        'An English rock band. <a href="https://last.fm/music">Read more</a>',
      links: {
        link: { href: 'https://www.last.fm/music/Arctic+Monkeys/+wiki' },
      },
    },
  },
};

export const wikipediaSummaryFixture = {
  extract: 'Arctic Monkeys are an English rock band formed in Sheffield.',
  content_urls: {
    desktop: { page: 'https://en.wikipedia.org/wiki/Arctic_Monkeys' },
  },
  originalimage: { source: 'https://upload.wikimedia.org/arctic-monkeys.jpg' },
  lang: 'en',
  title: 'Arctic Monkeys',
};

export const coverArtArchiveFixture = {
  images: [
    {
      image: 'https://coverartarchive.org/release-group/example/front.jpg',
      thumbnails: {
        small:
          'https://coverartarchive.org/release-group/example/front-250.jpg',
        large:
          'https://coverartarchive.org/release-group/example/front-500.jpg',
        '500':
          'https://coverartarchive.org/release-group/example/front-500.jpg',
      },
    },
  ],
};

export const genreClassificationFixtures = [
  {
    artist: 'Radiohead',
    tags: [
      { name: 'indie', count: 30 },
      { name: 'seen live', count: 100 },
      { name: 'british', count: 100 },
      { name: 'alternative rock', count: 20 },
    ],
    expectedMacros: ['indie', 'rock'],
  },
  {
    artist: 'The Strokes',
    tags: [
      { name: 'indie rock', count: 30 },
      { name: 'garage rock', count: 20 },
      { name: 'seen live', count: 100 },
      { name: 'british', count: 100 },
    ],
    expectedMacros: ['indie', 'rock'],
  },
  {
    artist: 'Arctic Monkeys',
    tags: [
      { name: 'indie', count: 30 },
      { name: 'alternative rock', count: 25 },
      { name: 'seen live', count: 100 },
      { name: 'british', count: 100 },
    ],
    expectedMacros: ['indie', 'rock'],
  },
  {
    artist: 'ROSALÍA',
    tags: [
      { name: 'latin pop', count: 25 },
      { name: 'flamenco', count: 25 },
      { name: 'pop', count: 15 },
      { name: 'seen live', count: 100 },
      { name: 'spanish', count: 100 },
    ],
    expectedMacros: ['latin', 'pop'],
  },
  {
    artist: 'Manel',
    tags: [
      { name: 'indie folk', count: 30 },
      { name: 'folk català', count: 25 },
      { name: 'cançó', count: 20 },
      { name: 'seen live', count: 100 },
      { name: 'catalan', count: 100 },
    ],
    expectedMacros: ['indie', 'folk_acoustic'],
  },
] as const;
