import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'home-location-v1';

export type HomeLocation = {
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

export function countryFromDeviceLocale() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const region = locale.split('-').at(-1)?.toUpperCase() ?? '';
  return /^[A-Z]{2}$/.test(region) ? region : '';
}

export async function readHomeLocation(): Promise<HomeLocation> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {
      country: countryFromDeviceLocale(),
      city: '',
      latitude: null,
      longitude: null,
    };
  }
  const parsed: unknown = JSON.parse(stored);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('country' in parsed) ||
    typeof parsed.country !== 'string' ||
    !('city' in parsed) ||
    typeof parsed.city !== 'string' ||
    !('latitude' in parsed) ||
    !(typeof parsed.latitude === 'number' || parsed.latitude === null) ||
    !('longitude' in parsed) ||
    !(typeof parsed.longitude === 'number' || parsed.longitude === null)
  ) {
    throw new Error('Saved location preferences are invalid.');
  }
  return parsed as HomeLocation;
}

export async function writeHomeLocation(location: HomeLocation) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}
