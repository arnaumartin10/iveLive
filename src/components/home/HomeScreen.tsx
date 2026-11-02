import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Grain, Stamp, Ticket } from '../paper';
import { Text } from '../ui/Text';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../theme/store';
import { hardShadow, spacing } from '../../theme/tokens';

const modes: { label: string; value: ThemeMode }[] = [
  { label: 'Bright', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function HomeScreen() {
  const { colors, mode, scheme, setMode } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <Grain />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topline}>
          <Text variant="title">iveLive</Text>
          <Stamp label="LIVE" tilt={false} />
        </View>

        <Ticket serialNumber="IL-FIRST-SHOW" hasBarcode={false}>
          <Text variant="overline" color="accent">
            YOUR LIVE MUSIC LIFE
          </Text>
          <Text variant="display" style={styles.title}>
            Every show leaves a mark.
          </Text>
          <Text variant="body" color="secondary">
            A home for the music, nights, and moments you want to remember.
          </Text>
          <View style={[styles.rule, { backgroundColor: colors.line }]} />
          <Text variant="mono">YOUR LIVE HISTORY STARTS HERE</Text>
        </Ticket>

        <View
          style={[
            styles.appearance,
            hardShadow.sm,
            { backgroundColor: colors.surface, borderColor: colors.ink },
          ]}
        >
          <View style={styles.appearanceCopy}>
            <Text variant="title">Appearance</Text>
            <Text variant="caption" color="secondary">
              {scheme === 'dark' ? 'Dark' : 'Bright'} mode
            </Text>
          </View>
          <SegmentedControl
            options={modes}
            value={mode}
            onChange={(value) => setMode(value as ThemeMode)}
          />
        </View>

        <Text variant="overline" color="secondary" center>
          MADE FOR THE NIGHTS THAT STAY WITH YOU
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  page: {
    flexGrow: 1,
    gap: spacing.xl,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  topline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  title: { marginVertical: spacing.md },
  rule: { height: 1, marginVertical: spacing.lg, width: 52 },
  appearance: {
    alignItems: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  appearanceCopy: { flexShrink: 1, gap: spacing.xs },
});
