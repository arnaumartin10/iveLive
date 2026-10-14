import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { palette, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { StatsOverview } from '@components/stats/StatsOverview';
import { useUserConcerts } from '@features/concerts/hooks';
import { useAuthStore } from '@features/auth/store';

export default function StatsScreen() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'demo-user-id';

  const { data: concerts = [], isLoading } = useUserConcerts(userId);

  const handleLogConcert = () => {
    router.push('/log');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text variant="overline" color="amber" weight="bold">
            INSIGHTS
          </Text>
          <Text variant="headline" weight="black">
            Live Statistics
          </Text>
        </View>
      </View>

      <StatsOverview
        concerts={concerts}
        isLoading={isLoading}
        onLogFirstConcert={handleLogConcert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surface0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.surface1,
  },
});
