import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useMe } from '../../features/auth/hooks';
import { ProfileScreen } from '../../components/profile/ProfileScreen';

export default function UserProfileScreen() {
  const {
    username,
    tab,
    friendsTab,
    year,
    venue_type,
    macro,
    minRating,
    maxRating,
    date,
    highlight,
  } = useLocalSearchParams<{
    username: string;
    tab?: string;
    friendsTab?: string;
    year?: string;
    venue_type?: string;
    macro?: string;
    minRating?: string;
    maxRating?: string;
    date?: string;
    highlight?: string;
  }>();
  const me = useMe();
  const routeUsername = Array.isArray(username) ? username[0] : username;
  const profileTab =
    tab === 'timeline' || tab === 'diary' || tab === 'friends' || tab === 'wishlist'
      ? tab === 'diary'
        ? 'timeline'
        : tab
      : 'profile';
  if (
    routeUsername === 'me' ||
    (me.data?.username && routeUsername === me.data.username)
  ) {
    return (
      <Redirect
        href={routes.profile(profileTab, {
            friendsTab,
            year,
            venue_type,
            macro,
            minRating,
            maxRating,
            date,
            highlight,
          })}
      />
    );
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileScreen username={routeUsername} />
    </>
  );
}
