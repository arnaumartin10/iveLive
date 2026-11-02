import { Redirect } from 'expo-router';

export default function LegacyUserFriendsRoute() {
  return <Redirect href="/(tabs)/profile?tab=friends" />;
}
