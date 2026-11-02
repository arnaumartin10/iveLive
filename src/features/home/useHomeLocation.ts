import { useEffect, useState } from 'react';
import {
  readHomeLocation,
  writeHomeLocation,
  type HomeLocation,
} from './location';

export function useHomeLocation() {
  const [location, setLocation] = useState<HomeLocation>({
    country: '',
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
  }, []);

  async function save(next: HomeLocation) {
    await writeHomeLocation(next);
    setLocation(next);
    setError(null);
  }

  return { location, isLoading, error, save };
}
