/**
 * PAPER & INK — EmptyState
 *
 * Physical paper aesthetic: stamped iconography, dry gig-flavored voice,
 * Young Serif headings, no emoji.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, hardShadow } from '../../theme/tokens';
import { Text } from './Text';

export type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  title = 'Nothing on the setlist yet',
  description,
  icon: Icon,
  action,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {Icon ? (
        <View
          style={[
            styles.iconWrap,
            hardShadow.sm,
            {
              backgroundColor: colors.surface,
              borderColor: colors.ink,
            },
          ]}
        >
          <Icon color={colors.accent} size={28} strokeWidth={2.5} />
        </View>
      ) : null}
      <Text variant="title" center style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="secondary" center style={styles.description}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconWrap: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 60,
    transform: [{ rotate: '-1.5deg' }],
  },
  title: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  description: {
    marginTop: spacing.sm,
    maxWidth: 290,
    lineHeight: 22,
  },
  action: {
    marginTop: spacing.xl,
  },
});
