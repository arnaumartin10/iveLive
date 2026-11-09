const TITLES: Record<string, string> = {
  '/': 'Home',
  '/archive': 'Archive',
  '/callback': 'Sign in',
  '/cloud': 'Cloud',
  '/cloud-bench': 'Cloud bench',
  '/components': 'Components',
  '/friends': 'Friends',
  '/genres': 'Genres',
  '/legal/privacy': 'Privacy',
  '/legal/terms': 'Terms',
  '/log': 'New log',
  '/log/done': 'Log saved',
  '/notifications': 'Notifications',
  '/onboarding': 'Set up your profile',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/stats': 'Stats',
  '/stats/wall-of-fame': 'Wall of Fame',
  '/stats/wrapped': 'Your Wrapped',
  '/timeline': 'Timeline',
  '/welcome': 'Welcome',
  '/wrapped': 'Your Wrapped',
  '/wrapped/[year]': 'Your Wrapped',
};

export function getPageTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/artist/')) return 'Artist';
  if (pathname.startsWith('/genre/')) return 'Genre';
  if (pathname.startsWith('/log/')) return 'Concert log';
  if (pathname.startsWith('/user/')) return 'Profile';
  return 'Show cancelled';
}
