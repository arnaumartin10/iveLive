import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_HOME_COUNTRY,
  initializeHomeLocationOnce,
  readHomeLocation,
  writeHomeLocation,
  type HomeLocation,
} from './location';

export function useHomeLocation(promptOnFirstHomeVisit = false) {
  const [location, setLocation] = useState<HomeLocation>({
    country: DEFAULT_HOME_COUNTRY,
    city: '',
    latitude: null,
    longitude: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void readHomeLocation()
      .then((saved) => {
        if (active) setLocation(saved);
        if (!promptOnFirstHomeVisit) return;
        return initializeHomeLocationOnce().then((detected) => {
          if (active && detected) setLocation(detected);
        });
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause
              : new Error('Could not read saved location preferences.'),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [promptOnFirstHomeVisit]);

  const save = useCallback(async (next: HomeLocation) => {
    await writeHomeLocation(next);
    setLocation(next);
    setError(null);
  }, []);

  return { location, isLoading, error, save };
}
