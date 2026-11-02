import { useEffect } from 'react';
import * as Linking from 'expo-linking';
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
      setLoading(false);
    });

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    async function handleUrl(url: string | null) {
      if (!url || !url.includes('callback')) return;
      try {
        await completeAuthRedirect(url);
      } catch (error) {
        console.error('[IveLive] Auth redirect failed', error);
      }
    }

    void Linking.getInitialURL().then(handleUrl);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [setSession, setLoading]);
}
