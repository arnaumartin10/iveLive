import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { palette, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { TimelineView } from '@components/timeline/TimelineView';
import { useUserConcerts } from '@features/concerts/hooks';
import { useAuthStore } from '@features/auth/store';
import type { ConcertWithRelations } from '@features/concerts/types';

export default function TimelineScreen() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'demo-user-id';

  const {
    data: concerts = [],
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useUserConcerts(userId);

  const handleConcertPress = (concert: ConcertWithRelations) => {
    router.push({
      pathname: '/concert/[id]',
      params: { id: concert.id },
    });
  };

  const handleLogConcert = () => {
    router.push('/log');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text variant="overline" color="steel" weight="bold">
            TIMELINE
          </Text>
          <Text variant="headline" weight="black">
            Concert History
          </Text>
        </View>
        <Text variant="caption" color="secondary">
          {concerts.length} shows
        </Text>
      </View>

      <TimelineView
        concerts={concerts}
        isLoading={isLoading}
        isError={isError}
        isRefetching={isRefetching}
        onRefresh={() => void refetch()}
        onConcertPress={handleConcertPress}
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
