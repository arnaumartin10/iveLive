import React from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { palette, spacing } from '@theme/tokens';
import { ConcertCard } from './ConcertCard';
import { ConcertCardSkeleton } from '@components/ui/Skeleton';
import { EmptyState } from '@components/ui/EmptyState';
import { ErrorState } from '@components/ui/ErrorState';
import type { ConcertWithRelations } from '@features/concerts/types';

interface TimelineViewProps {
  concerts: ConcertWithRelations[];
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  onRefresh: () => void;
  onConcertPress: (concert: ConcertWithRelations) => void;
  onLogFirstConcert: () => void;
}

export function TimelineView({
  concerts,
  isLoading,
  isError,
  isRefetching,
  onRefresh,
  onConcertPress,
  onLogFirstConcert,
}: TimelineViewProps) {
  if (isLoading && concerts.length === 0) {
    return (
      <View style={styles.container}>
        <ConcertCardSkeleton />
        <ConcertCardSkeleton />
        <ConcertCardSkeleton />
        <ConcertCardSkeleton />
      </View>
    );
  }

  if (isError && concerts.length === 0) {
    return (
      <ErrorState
        title="Could not load timeline"
        message="Failed to sync your concert memories. Pull to retry."
        onRetry={onRefresh}
      />
    );
  }

  if (concerts.length === 0) {
    return (
      <EmptyState
        title="No Live Music Logged Yet"
        subtitle="Every gig you attend belongs in your archive. Log your favorite artist now."
        actionLabel="Log a Concert"
        onAction={onLogFirstConcert}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={concerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConcertCard concert={item} onPress={onConcertPress} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={palette.crimson}
            colors={[palette.crimson]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface0,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[12],
  },
});
