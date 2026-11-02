import { useState } from 'react';
import { ActivityIndicator, Alert, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { countryFromDeviceLocale } from './location';
import type { HomeLocation } from './location';

type LocationPreferenceSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  onSaved: (location: HomeLocation) => Promise<void> | void;
  location: HomeLocation;
  isLoading: boolean;
};

export function LocationPreferenceSheet({
  visible,
  onDismiss,
  onSaved,
  location,
  isLoading,
}: LocationPreferenceSheetProps) {
  const { colors } = useTheme();

  return (
    <Sheet
      title="Your location"
      visible={visible}
      onDismiss={onDismiss}
      snapPoints={['55%']}
    >
      {visible ? (
        isLoading ? (
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <LocationPreferenceForm
            location={location}
            onDismiss={onDismiss}
            onSaved={onSaved}
          />
        )
      ) : null}
    </Sheet>
  );
}

function LocationPreferenceForm({
  location,
  onDismiss,
  onSaved,
}: {
  location: HomeLocation;
  onDismiss: () => void;
  onSaved: LocationPreferenceSheetProps['onSaved'];
}) {
  const { colors } = useTheme();
  const [country, setCountry] = useState(location.country);
  const [city, setCity] = useState(location.city);
  const [busy, setBusy] = useState(false);

  async function saveManualLocation() {
    const countryCode = country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      Alert.alert(
        'Check your country code',
        'Enter a two-letter country code.',
      );
      return;
    }

    setBusy(true);
    try {
      const next = {
        country: countryCode,
        city: city.trim(),
        latitude: null,
        longitude: null,
      } satisfies HomeLocation;
      await onSaved(next);
      onDismiss();
    } catch (error) {
      Alert.alert(
        'Could not save location',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestDeviceLocation() {
    setBusy(true);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== 'granted') {
        throw new Error('Location permission was not granted.');
      }

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
      const next = {
        country:
          place?.isoCountryCode?.toUpperCase() ?? countryFromDeviceLocale(),
        city: place?.city ?? place?.subregion ?? '',
        latitude,
        longitude,
      };
      await onSaved(next);
      onDismiss();
    } catch (error) {
      Alert.alert(
        'Could not get your location',
        error instanceof Error ? error.message : 'Try entering your location.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.xl }}>
      <Text variant="caption" color="secondary">
        Device location uses coarse coordinates to find nearby tour dates on
        Home. They stay private and are not shown on your profile.
      </Text>
      <TextInput
        accessibilityLabel="Country code"
        autoCapitalize="characters"
        maxLength={2}
        onChangeText={setCountry}
        placeholder="Country code (e.g. ES)"
        placeholderTextColor={colors.inkMuted}
        value={country}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.line,
          borderWidth: 1,
          color: colors.ink,
          minHeight: 48,
          paddingHorizontal: spacing.md,
        }}
      />
      <TextInput
        accessibilityLabel="City"
        onChangeText={setCity}
        placeholder="City (optional)"
        placeholderTextColor={colors.inkMuted}
        value={city}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.line,
          borderWidth: 1,
          color: colors.ink,
          minHeight: 48,
          paddingHorizontal: spacing.md,
        }}
      />
      <Button
        label="Use device location"
        variant="secondary"
        loading={busy}
        onPress={() => void requestDeviceLocation()}
      />
      <Button
        label="Save location"
        onPress={() => void saveManualLocation()}
        loading={busy}
      />
    </View>
  );
}
