import { Redirect } from 'expo-router';

export default function LegacyArchiveRoute() {
  return <Redirect href="/(tabs)/profile?tab=timeline" />;
}
