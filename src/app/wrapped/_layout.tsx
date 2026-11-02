import { Stack } from 'expo-router';

export default function WrappedLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
