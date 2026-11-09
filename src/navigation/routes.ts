import type { Href } from 'expo-router';

export type UserTab = 'profile' | 'timeline' | 'friends' | 'wishlist';

export type RouteOptions = {
  returnTo?: string;
};

export type ProfileRouteParams = {
  friendsTab?: string;
  year?: string;
  venue_type?: string;
  macro?: string;
  minRating?: string;
  maxRating?: string;
  date?: string;
  highlight?: string;
};

export const routes = {
  home: (): Href => '/(tabs)',
  cloud: (focus?: string): Href =>
    focus
      ? { pathname: '/(tabs)/cloud', params: { focus } }
      : '/(tabs)/cloud',
  stats: (): Href => '/(tabs)/stats',
  profile: (
    tab: UserTab = 'profile',
    params: ProfileRouteParams = {},
  ): Href => ({
      pathname: '/(tabs)/profile',
      params: { tab, ...params },
    }),
  profilePath: (tab: UserTab = 'profile'): string =>
    `/profile?tab=${encodeURIComponent(tab)}`,
  settings: (): Href => '/(tabs)/settings',
  logWizard: (params?: Record<string, string>): Href =>
    params ? { pathname: '/log', params } : '/log',
  logStep: (
    step:
      | 'artist'
      | 'date'
      | 'venue'
      | 'venue-details'
      | 'review',
  ): Href => `/log/step-${step}`,
  logKeepsakes: (id: string, setlistSaveFailed?: string): Href => ({
    pathname: '/log/step-keepsakes',
    params: { id, ...(setlistSaveFailed ? { setlistSaveFailed } : {}) },
  }),
  logDone: (id: string, skipped: boolean, setlistSaveFailed?: boolean): Href => ({
    pathname: '/log/done',
    params: {
      id,
      skipped: skipped ? 'true' : 'false',
      ...(setlistSaveFailed ? { setlistSaveFailed: 'true' } : {}),
    },
  }),
  log: (id: string, options: RouteOptions = {}): Href => ({
    pathname: '/log/[id]',
    params: { id, ...(options.returnTo ? { returnTo: options.returnTo } : {}) },
  }),
  logDeepLink: (
    id: string,
    scheme: string | string[] = 'ivelive',
  ): string => {
    const appScheme = Array.isArray(scheme) ? (scheme[0] ?? 'ivelive') : scheme;
    return `${appScheme}://log/${encodeURIComponent(id)}`;
  },
  logPublicUrl: (id: string): string =>
    `https://ivelive.app/log/${encodeURIComponent(id)}`,
  artist: (id: string): Href => ({
    pathname: '/artist/[id]',
    params: { id },
  }),
  artistPath: (id: string): string => `/artist/${encodeURIComponent(id)}`,
  artistNew: (initialName?: string): Href =>
    initialName
      ? { pathname: '/artist/new', params: { initialName } }
      : '/artist/new',
  genre: (slug: string, branch?: string): Href => ({
    pathname: '/genre/[slug]',
    params: { slug, ...(branch ? { branch } : {}) },
  }),
  genres: (): Href => '/genres',
  user: (
    username: string,
    options: { tab?: UserTab; [key: string]: string | undefined } = {},
  ): Href => ({
    pathname: '/user/[username]',
    params: { username, ...options },
  }),
  diary: (
    username: string,
    params?: Record<string, string | undefined>,
  ): Href => ({
    pathname: '/user/[username]',
    params: { ...params, username, tab: 'timeline' },
  }),
  notifications: (): Href => '/notifications',
  wrapped: (year?: string): Href =>
    year ? { pathname: '/wrapped', params: { year } } : '/wrapped',
  wrappedYear: (year: string): Href => ({
    pathname: '/wrapped/[year]',
    params: { year },
  }),
  wallOfFame: (): Href => '/stats/wall-of-fame',
  statsWrapped: (): Href => '/stats/wrapped',
  welcome: (): Href => '/(auth)/welcome',
  callback: (returnTo?: string): Href =>
    returnTo
      ? { pathname: '/(auth)/callback', params: { returnTo } }
      : '/(auth)/callback',
  onboarding: (): Href => '/(auth)/onboarding',
  terms: (): Href => '/legal/terms',
  privacy: (): Href => '/legal/privacy',
  devCloudBench: (): Href => '/cloud-bench',
  devComponents: (): Href => '/components',
  fallback: {
    artist: (): Href => '/(tabs)',
    genre: (): Href => '/genres',
    genres: (): Href => '/(tabs)',
    log: (): Href => ({
      pathname: '/(tabs)/profile',
      params: { tab: 'timeline' },
    }),
    user: (): Href => '/(tabs)',
    wizard: (): Href => '/(tabs)',
    settings: (): Href => '/(tabs)/profile',
    feedback: (): Href => '/(tabs)/settings',
    legal: (): Href => '/(auth)/welcome',
  },
  legacy: {
    timeline: (): Href => '/timeline',
    archive: (): Href => '/archive',
    friends: (): Href => '/friends',
    userFriends: (): Href => '/user/friends',
    userDiary: (
      username: string,
      params?: Record<string, string | undefined>,
    ): Href => ({
      pathname: '/user/[username]/diary',
      params: { ...params, username },
    }),
    userFriendsTab: (username: string): Href => ({
      pathname: '/user/[username]/friends',
      params: { username },
    }),
    userWishlist: (username: string): Href => ({
      pathname: '/user/[username]/wishlist',
      params: { username },
    }),
  },
} as const;

export function getLogFallback(
  ownerUsername: string | null | undefined,
  isCurrentUser: boolean,
): Href {
  if (isCurrentUser) return routes.profile('timeline');
  if (ownerUsername) return routes.user(ownerUsername, { tab: 'timeline' });
  return routes.fallback.log();
}
