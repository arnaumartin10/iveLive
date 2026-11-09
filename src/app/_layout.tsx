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
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import {
  router,
  Stack,
  SplashScreen,
  usePathname,
  useSegments,
} from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
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
import { hasAlphaInvite } from '../features/auth/api';
import { queryClient } from '../lib/queryClient';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { routes } from '../navigation/routes';
import { clearSessionData } from '../navigation/clearSessionData';
import { getPageTitle } from '../navigation/pageTitles';
import {
  consumeReturnTo,
  getCurrentInternalPath,
  returnToHref,
  saveReturnTo,
} from '../navigation/returnTo';

void SplashScreen.preventAutoHideAsync();

function AppContent({ fontsReady }: { fontsReady: boolean }) {
  useAuthListener();
  const { colors, scheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const segments = useSegments();
  const pathname = usePathname();
  const alphaInviteOnly = Constants.expoConfig?.extra?.alphaInviteOnly === true;
  const alphaInviteQuery = useQuery({
    queryKey: ['alpha-invite-status', user?.id],
    queryFn: hasAlphaInvite,
    enabled: alphaInviteOnly && Boolean(user?.id),
  });
  const profileQuery = useMe();
  const firstSegment = segments[0];
  const secondSegment = segments[1];
  const publicDevRoute = __DEV__ && firstSegment === '(dev)';
  const redirectKey = `${user?.id ?? 'signed-out'}:${firstSegment ?? ''}:${secondSegment ?? ''}`;
  const lastRedirectKey = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${getPageTitle(pathname)} · IveLive`;
    }
  }, [pathname]);

  useEffect(() => {
    if (
      !fontsReady ||
      authLoading ||
      (user &&
        (profileQuery.isLoading ||
          (alphaInviteOnly && alphaInviteQuery.isLoading)))
    ) {
      return;
    }
    void SplashScreen.hideAsync().catch((error: unknown) => {
      console.error('[splash] Could not hide the native splash screen.', error);
    });
  }, [
    alphaInviteOnly,
    alphaInviteQuery.isLoading,
    authLoading,
    fontsReady,
    profileQuery.isLoading,
    user,
  ]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      const isPublicAuthRoute =
        firstSegment === '(auth)' &&
        (secondSegment === 'welcome' || secondSegment === 'callback');
      if (
        !isPublicAuthRoute &&
        !publicDevRoute &&
        String(firstSegment) !== 'legal'
      ) {
        if (lastRedirectKey.current !== redirectKey) {
          lastRedirectKey.current = redirectKey;
          const currentPath = getCurrentInternalPath();
          void saveReturnTo(currentPath !== '/' ? currentPath : pathname).catch(
            (error: unknown) => {
              console.error('[navigation] Could not save the requested path.', error);
            },
          );
          router.replace(routes.welcome());
        }
      }
      return;
    }

    if (
      profileQuery.isLoading ||
      profileQuery.error ||
      (alphaInviteOnly &&
        (alphaInviteQuery.isLoading || alphaInviteQuery.isError))
    ) {
      return;
    }

    if (alphaInviteOnly && alphaInviteQuery.data !== true) {
      if (firstSegment !== '(auth)' || secondSegment !== 'onboarding') {
        if (lastRedirectKey.current !== redirectKey) {
          lastRedirectKey.current = redirectKey;
          router.replace(routes.onboarding());
        }
      }
      return;
    }

    const needsOnboarding =
      !profileQuery.data || profileQuery.data.username.startsWith('user_');

    if (needsOnboarding) {
      if (firstSegment !== '(auth)' || secondSegment !== 'onboarding') {
        if (lastRedirectKey.current !== redirectKey) {
          lastRedirectKey.current = redirectKey;
          router.replace(routes.onboarding());
        }
      }
      return;
    }

    if (firstSegment === '(auth)' && secondSegment !== 'onboarding') {
      if (lastRedirectKey.current !== redirectKey) {
        lastRedirectKey.current = redirectKey;
        let active = true;
        void consumeReturnTo()
          .then((destination) => {
            if (active) {
              router.replace(
                returnToHref(destination) ?? routes.home(),
              );
            }
          })
          .catch((error: unknown) => {
            console.error('[navigation] Could not restore the requested path.', error);
            if (active) router.replace(routes.home());
          });
        return () => {
          active = false;
        };
      }
    }
    return undefined;
  }, [
    authLoading,
    alphaInviteOnly,
    alphaInviteQuery.data,
    alphaInviteQuery.isError,
    alphaInviteQuery.isLoading,
    firstSegment,
    profileQuery.data,
    profileQuery.error,
    profileQuery.isLoading,
    pathname,
    redirectKey,
    secondSegment,
    user,
  ]);

  const publicAuthRoute =
    firstSegment === '(auth)' &&
    (secondSegment === 'welcome' || secondSegment === 'callback');
  const signedOutRedirectPending =
    !authLoading &&
    !user &&
    !publicAuthRoute &&
    !publicDevRoute &&
    String(firstSegment) !== 'legal';
  const signedInRedirectPending =
    Boolean(user) &&
    ((!profileQuery.isLoading &&
      !profileQuery.error &&
      !alphaInviteQuery.isLoading &&
      !alphaInviteQuery.isError &&
      ((alphaInviteOnly && alphaInviteQuery.data !== true) ||
        !profileQuery.data ||
        profileQuery.data.username.startsWith('user_')) &&
      (firstSegment !== '(auth)' || secondSegment !== 'onboarding')) ||
      (firstSegment === '(auth)' && secondSegment !== 'onboarding'));

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {authLoading ||
      signedOutRedirectPending ||
      signedInRedirectPending ||
      (user &&
        (profileQuery.isLoading ||
          (alphaInviteOnly && alphaInviteQuery.isLoading))) ? (
        <View style={[styles.loading, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.accent} />
          <Text variant="caption" color="secondary">
            Getting things ready
          </Text>
        </View>
      ) : profileQuery.error ||
        (alphaInviteOnly && alphaInviteQuery.isError) ? (
        <View style={[styles.loading, { backgroundColor: colors.bg }]}>
          <Text variant="title">
            {profileQuery.error
              ? 'Could not load your profile'
              : 'Could not check your invite'}
          </Text>
          <Text variant="caption" color="secondary" center>
            Check your connection and try again.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <Button
              label="Try Again"
              onPress={() => {
                if (profileQuery.error) void profileQuery.refetch();
                if (alphaInviteQuery.isError) void alphaInviteQuery.refetch();
              }}
            />
            <Button
              label="Sign Out"
              variant="secondary"
              onPress={async () => {
                const { error } = await supabase.auth.signOut();
                if (error) {
                  console.error('[auth] Sign out failed.', error);
                  return;
                }
                try {
                  await clearSessionData();
                } catch (cleanupError) {
                  console.error(
                    '[auth] Could not clear all local session data.',
                    cleanupError,
                  );
                }
                router.replace(routes.welcome());
              }}
            />
          </View>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="genre/[slug]" />
          <Stack.Screen name="genres/index" />
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
