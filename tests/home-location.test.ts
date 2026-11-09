import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  DEFAULT_HOME_COUNTRY,
  countryNameFromCode,
  initializeHomeLocationOnce,
  readHomeLocation,
} from '../src/features/home/location';

jest.mock('expo-location', () => ({
  Accuracy: { Low: 1 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

describe('first Home location setup', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(Location.getForegroundPermissionsAsync).mockReset();
    jest.mocked(Location.requestForegroundPermissionsAsync).mockReset();
    jest.mocked(Location.getCurrentPositionAsync).mockReset();
    jest.mocked(Location.reverseGeocodeAsync).mockReset();
  });

  it('uses the United Kingdom when location permission is denied and asks only once', async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
      status: 'undetermined',
    } as never);
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      status: 'denied',
    } as never);

    const first = await initializeHomeLocationOnce();
    const second = await initializeHomeLocationOnce();

    expect(first).toEqual({
      country: DEFAULT_HOME_COUNTRY,
      city: '',
      latitude: null,
      longitude: null,
    });
    expect(second).toBeNull();
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await readHomeLocation()).toEqual(first);
  });

  it('stores the coarse device location when permission is granted', async () => {
    jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({
      status: 'undetermined',
    } as never);
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      status: 'granted',
    } as never);
    jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
      coords: { latitude: 51.5074, longitude: -0.1278 },
    } as never);
    jest
      .mocked(Location.reverseGeocodeAsync)
      .mockResolvedValue([{ isoCountryCode: 'GB', city: 'London' }] as never);

    await expect(initializeHomeLocationOnce()).resolves.toEqual({
      country: 'GB',
      city: 'London',
      latitude: 51.51,
      longitude: -0.13,
    });
  });

  it('preserves a previously saved location without prompting again', async () => {
    await AsyncStorage.setItem(
      'home-location-v1',
      JSON.stringify({
        country: 'ES',
        city: 'Barcelona',
        latitude: null,
        longitude: null,
      }),
    );

    await expect(initializeHomeLocationOnce()).resolves.toBeNull();
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('home-location-prompted-v1')).toBe(
      'true',
    );
  });

  it('uses readable country names instead of exposing country codes in UI', () => {
    expect(countryNameFromCode('GB')).toBe('United Kingdom');
    expect(countryNameFromCode('ES')).toBe('Spain');
    expect(countryNameFromCode('')).toBe('');
  });
});
