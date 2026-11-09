import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const STORAGE_KEY = 'home-location-v1';
const LOCATION_PROMPTED_KEY = 'home-location-prompted-v1';
export const DEFAULT_HOME_COUNTRY = 'GB';

export type HomeLocation = {
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

export function countryFromDeviceLocale() {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const region = locale.split('-').at(-1)?.toUpperCase() ?? '';
  return /^[A-Z]{2}$/.test(region) ? region : DEFAULT_HOME_COUNTRY;
}

export function countryNameFromCode(countryCode: string): string {
  if (!/^[A-Z]{2}$/i.test(countryCode)) return '';
  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'region' }).of(
        countryCode.toUpperCase(),
      ) ?? 'United Kingdom'
    );
  } catch {
    return countryCode.toUpperCase() === DEFAULT_HOME_COUNTRY
      ? 'United Kingdom'
      : 'Your country';
  }
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
  const country = parsed.country.trim().toUpperCase();
  return {
    ...(parsed as HomeLocation),
    country: /^[A-Z]{2}$/.test(country) ? country : DEFAULT_HOME_COUNTRY,
  };
}

export async function writeHomeLocation(location: HomeLocation) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

export async function initializeHomeLocationOnce(): Promise<HomeLocation | null> {
  if (await AsyncStorage.getItem(LOCATION_PROMPTED_KEY)) return null;

  if (await AsyncStorage.getItem(STORAGE_KEY)) {
    await AsyncStorage.setItem(LOCATION_PROMPTED_KEY, 'true');
    return null;
  }

  await AsyncStorage.setItem(LOCATION_PROMPTED_KEY, 'true');
  let detected: HomeLocation = {
    country: DEFAULT_HOME_COUNTRY,
    city: '',
    latitude: null,
    longitude: null,
  };

  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === 'undetermined') {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status === 'granted') {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const latitude = Math.round(position.coords.latitude * 100) / 100;
      const longitude = Math.round(position.coords.longitude * 100) / 100;
      const places = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      const place = places[0];
      const country = place?.isoCountryCode?.toUpperCase();
      detected = {
        country:
          country && /^[A-Z]{2}$/.test(country)
            ? country
            : DEFAULT_HOME_COUNTRY,
        city: place?.city ?? place?.subregion ?? '',
        latitude,
        longitude,
      };
    }
  } catch {
    detected = {
      country: DEFAULT_HOME_COUNTRY,
      city: '',
      latitude: null,
      longitude: null,
    };
  }

  await writeHomeLocation(detected);
  return detected;
}
