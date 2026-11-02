import { Redirect } from 'expo-router';

export default function LegacyTimelineRoute() {
  return <Redirect href="/(tabs)/profile?tab=timeline" />;
}
