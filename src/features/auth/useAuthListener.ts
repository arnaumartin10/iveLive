import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { supabase } from '@lib/supabase';
import { useAuthStore } from './store';
import { completeAuthRedirect } from './oauth';

/**
 * Subscribes to Supabase auth state changes and syncs them into Zustand.
 * Should be mounted once at the root layout.
 */
export function useAuthListener() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    let mounted = true;

    function isWebAuthRedirect(url: string): boolean {
      try {
        const parsed = new URL(url);
        const fragment = new URLSearchParams(parsed.hash.slice(1));
        return (
          parsed.searchParams.has('code') ||
          parsed.searchParams.has('token_hash') ||
          (fragment.has('access_token') && fragment.has('refresh_token'))
        );
      } catch {
        return false;
      }
    }

    async function handleUrl(url: string | null) {
      if (!url) return;
      if (Platform.OS === 'web' ? !isWebAuthRedirect(url) : !url.includes('callback')) {
        return;
      }
      try {
        await completeAuthRedirect(url);
      } catch (error) {
        console.error('[IveLive] Auth redirect failed', error);
      }
    }

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    async function initializeSession() {
      try {
        const initialUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();
        await handleUrl(initialUrl);
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) setSession(data.session);
      } catch (error) {
        console.error('[IveLive] Could not restore the auth session.', error);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initializeSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [setSession, setLoading]);
}
