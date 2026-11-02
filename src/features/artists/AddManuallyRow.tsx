import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronRight, PlusCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../components/ui/Text';

interface AddManuallyRowProps {
  onPress: () => void;
  query?: string;
}

export function AddManuallyRow({ onPress, query }: AddManuallyRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Can't find them? Add manually"
      accessibilityHint="Opens form to create a custom artist"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.line,
          backgroundColor: colors.surfaceRaised,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: `${colors.accent}1F` },
        ]}
      >
        <PlusCircle color={colors.accent} size={22} />
      </View>

      <View style={styles.copy}>
        <Text variant="label" weight="bold" numberOfLines={1}>
          Can&apos;t find them? Add manually
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {query?.trim()
            ? `Create "${query.trim()}" as a custom artist`
            : 'Add an independent or underground artist'}
        </Text>
      </View>

      <ChevronRight color={colors.inkMuted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginVertical: 10,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
});
