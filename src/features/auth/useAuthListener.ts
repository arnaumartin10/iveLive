import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useAuthStore } from './store';

/**
 * Subscribes to Supabase auth state changes and syncs them into Zustand.
 * Should be mounted once at the root layout.
 */
export function useAuthListener() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Subscribe to future changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);
}
