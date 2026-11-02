import { Redirect, useLocalSearchParams } from 'expo-router';

export default function UserWishlistAlias() {
  const params = useLocalSearchParams<{ username: string }>();
  const username = Array.isArray(params.username)
    ? (params.username[0] ?? '')
    : (params.username ?? '');
  return (
    <Redirect
      href={{
        pathname: '/user/[username]',
        params: { ...params, username, tab: 'wishlist' },
      }}
    />
  );
}
