import { Redirect, useLocalSearchParams } from 'expo-router';
import { routes } from '../../../navigation/routes';

export default function UserWishlistAlias() {
  const params = useLocalSearchParams<{ username: string }>();
  const username = Array.isArray(params.username)
    ? (params.username[0] ?? '')
    : (params.username ?? '');
  return (
    <Redirect
      href={routes.user(username, { tab: 'wishlist' })}
    />
  );
}
