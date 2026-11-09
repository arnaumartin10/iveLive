import { ActivityIndicator, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { countryNameFromCode, DEFAULT_HOME_COUNTRY } from './location';
import type { HomeLocation } from './location';

type LocationPreferenceSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  location: HomeLocation;
  isLoading: boolean;
};

export function LocationPreferenceSheet({
  visible,
  onDismiss,
  location,
  isLoading,
}: LocationPreferenceSheetProps) {
  const { colors } = useTheme();
  const countryName = countryNameFromCode(location.country) || 'United Kingdom';

  return (
    <Sheet
      title="Your location"
      visible={visible}
      onDismiss={onDismiss}
      snapPoints={['45%']}
    >
      {visible ? (
        isLoading ? (
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View
            style={{
              gap: spacing.md,
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.xl,
            }}
          >
            <Text variant="subtitle" weight="bold">
              {location.city ? `${location.city}, ${countryName}` : countryName}
            </Text>
            <Text variant="caption" color="secondary">
              IveLive uses your device location for nearby tours and country
              charts. It is stored on this device and is not shown on your
              profile.
            </Text>
            {location.country === DEFAULT_HOME_COUNTRY &&
            location.latitude === null ? (
              <Text variant="caption" color="secondary">
                Location access was unavailable, so we use the United Kingdom as
                the default chart country.
              </Text>
            ) : null}
            <Button label="Done" variant="secondary" onPress={onDismiss} />
          </View>
        )
      ) : null}
    </Sheet>
  );
}
