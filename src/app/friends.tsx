import { Redirect } from 'expo-router';

export default function LegacyFriendsRoute() {
  return <Redirect href="/(tabs)/profile?tab=friends" />;
}
