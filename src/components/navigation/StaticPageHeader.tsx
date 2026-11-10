import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

export function StaticPageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.bg, borderBottomColor: colors.line },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={styles.backButton}
      >
        <ArrowLeft size={21} color={colors.ink} />
      </Pressable>
      <Text
        variant="label"
        weight="bold"
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  title: { flex: 1, minWidth: 0 },
  spacer: { width: 44 },
});
