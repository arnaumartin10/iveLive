import { Redirect, useLocalSearchParams } from 'expo-router';

export default function UserDiaryAlias() {
  const params = useLocalSearchParams<{
    username: string;
    year?: string;
    venue_type?: string;
    macro?: string;
    minRating?: string;
    maxRating?: string;
    date?: string;
    highlight?: string;
  }>();
  const username = Array.isArray(params.username)
    ? (params.username[0] ?? '')
    : (params.username ?? '');
  return (
    <Redirect
      href={{
        pathname: '/user/[username]',
        params: {
          ...params,
          username,
          tab: 'timeline',
        },
      }}
    />
  );
}
