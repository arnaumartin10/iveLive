import '../global.css';
import '../lib/env';

import { YoungSerif_400Regular } from '@expo-google-fonts/young-serif';
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_900Black,
} from '@expo-google-fonts/schibsted-grotesk';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { router, Stack, SplashScreen, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalErrorBoundary } from '../components/ui/GlobalErrorBoundary';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../features/auth/store';
import { ArtistCardProvider } from '../features/artists/ArtistCardProvider';
import { useAuthListener } from '../features/auth/useAuthListener';
import { useMe } from '../features/auth/hooks';
import { queryClient } from '../lib/queryClient';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

void SplashScreen.preventAutoHideAsync();

function AppContent({ fontsReady }: { fontsReady: boolean }) {
  useAuthListener();
  const { colors, scheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const segments = useSegments();
  const profileQuery = useMe();
  const firstSegment = segments[0];
  const secondSegment = segments[1];

  useEffect(() => {
    if (!fontsReady || authLoading || (user && profileQuery.isLoading)) return;
    void SplashScreen.hideAsync().catch((error: unknown) => {
      console.error('[splash] Could not hide the native splash screen.', error);
    });
  }, [authLoading, fontsReady, profileQuery.isLoading, user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      const isPublicAuthRoute =
        firstSegment === '(auth)' &&
        (secondSegment === 'welcome' || secondSegment === 'callback');
      if (!isPublicAuthRoute && String(firstSegment) !== 'legal') {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    if (profileQuery.isLoading || profileQuery.error) return;

    const needsOnboarding =
      !profileQuery.data || profileQuery.data.username.startsWith('user_');

    if (needsOnboarding) {
      if (firstSegment !== '(auth)' || secondSegment !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      }
      return;
    }

    if (firstSegment === '(auth)') router.replace('/(tabs)');
  }, [
    authLoading,
    firstSegment,
    profileQuery.data,
    profileQuery.error,
    profileQuery.isLoading,
    secondSegment,
    user,
  ]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {authLoading || (user && profileQuery.isLoading) ? (
        <View style={[styles.loading, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.accent} />
          <Text variant="caption" color="secondary">
            Getting things ready
          </Text>
        </View>
      ) : profileQuery.error ? (
        <View style={[styles.loading, { backgroundColor: colors.bg }]}>
          <Text variant="title">Could not load your profile</Text>
          <Text variant="caption" color="secondary" center>
            {profileQuery.error instanceof Error
              ? profileQuery.error.message
              : 'Check your connection and restart IveLive.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Button
              label="Try Again"
              onPress={() => {
                void profileQuery.refetch();
              }}
            />
            <Button
              label="Sign Out"
              variant="secondary"
              onPress={async () => {
                await supabase.auth.signOut();
                router.replace('/(auth)/welcome');
              }}
            />
          </View>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="log"
            options={{
              presentation: 'card',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
          <Stack.Screen name="artist/[id]" />
          <Stack.Screen name="artist/new" />
          <Stack.Screen name="user/[username]" />
          <Stack.Screen name="user/[username]/diary" />
          <Stack.Screen name="user/[username]/friends" />
          <Stack.Screen name="user/[username]/wishlist" />
          <Stack.Screen name="user/friends" />
          <Stack.Screen name="archive" />
          <Stack.Screen name="timeline" />
          <Stack.Screen name="friends" />
          <Stack.Screen
            name="wrapped"
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_right',
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(dev)/components" />
          <Stack.Screen name="legal/privacy" />
          <Stack.Screen name="legal/terms" />
        </Stack>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    YoungSerif_400Regular,
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_900Black,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <GlobalErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <ArtistCardProvider>
                <AppContent fontsReady={Boolean(fontsLoaded || fontError)} />
              </ArtistCardProvider>
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </GlobalErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
