import { useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

function hasInternalBrowserHistory(): boolean {
  if (typeof window === 'undefined' || window.history.length <= 1) return false;
  if (typeof document === 'undefined' || !document.referrer) return false;

  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export type SafeBackDecision =
  | { type: 'back' }
  | { type: 'replace'; fallback: Href };

export function getSafeBackDecision(
  canGoBack: boolean,
  fallback: Href,
): SafeBackDecision {
  return canGoBack ? { type: 'back' } : { type: 'replace', fallback };
}

export function useSafeBack(
  fallback: Href,
  { handleHardwareBack = true }: { handleHardwareBack?: boolean } = {},
) {
  const router = useRouter();

  const goBack = useCallback(() => {
    const canGoBack =
      Platform.OS === 'web'
        ? router.canGoBack() || hasInternalBrowserHistory()
        : router.canGoBack();

    const decision = getSafeBackDecision(canGoBack, fallback);
    if (decision.type === 'back') {
      router.back();
    } else {
      router.replace(decision.fallback);
    }
  }, [fallback, router]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' || !handleHardwareBack) return;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          goBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [goBack, handleHardwareBack]),
  );

  return goBack;
}
