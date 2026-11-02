export const cloudExperienceStrings = {
  intro: {
    title: 'THE PRINT RUN',
    skip: 'Tap to skip',
  },
  territory: {
    newTerritory: 'NEW TERRITORY',
    unexplored: 'UNEXPLORED',
    copy: 'A blank patch of paper, waiting for your next show.',
    seeAtlas: 'See on the atlas',
    logShow: 'Log a show',
    discover: 'Discover',
    share: 'SHARE OF SHOWS',
    averageRating: 'AVG RATING',
    firstSeen: 'FIRST SEEN',
    lastSeen: 'LAST SEEN',
  },
  arrivals: (count: number) => `${count} NEW ARRIVAL${count === 1 ? '' : 'S'}`,
  tour: {
    button: 'Fly me through it',
    pause: 'Hold to pause',
    continue: 'Release to continue',
    overview: 'Every show leaves a mark.',
    biggestTerritory: (genre: string) => `${genre} is where you return most.`,
    mostSeenArtist: (artist: string, count: number) =>
      `You have seen ${artist} ${count} times.`,
    highestRatedArtist: (artist: string) =>
      `${artist} earned your highest average rating.`,
    oldestArtist: (artist: string) => `${artist} opened your live-music story.`,
    recentShow: (artist: string) =>
      `Your most recent chapter belongs to ${artist}.`,
    rarestTerritory: (genre: string) =>
      `${genre} makes a smaller, distinct mark.`,
    closing: (prototype: string | null) =>
      prototype
        ? `And the whole atlas reads: ${prototype}.`
        : 'Your next show is a new page.',
  },
  hud: {
    explored: 'WORLD EXPLORED',
    replay: 'Replay print run',
    legend: 'Legend',
    motion: 'Motion effects',
    sound: 'Sound',
  },
  milestones: {
    firstFiveStar: 'FIRST FIVE-STAR',
    firstFestival: 'FIRST FESTIVAL',
    tenthShow: '10TH SHOW',
    fiftiethShow: '50TH SHOW',
    hundredthShow: '100TH SHOW',
    firstShow: 'FIRST SHOW',
  },
} as const;
