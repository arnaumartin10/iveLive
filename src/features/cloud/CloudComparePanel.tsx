import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Text } from '../../components/ui/Text';
import { searchProfiles } from '../social/api';
import { posterTerritoryLabel } from './poster';
import { fetchCompareAtlas, type CompareAtlas } from './compare';
import type { CloudArtistData } from './types';

export function CloudComparePanel({
  visible,
  atlas,
  userId,
  artists,
  onAtlasChange,
  onDismiss,
}: {
  visible: boolean;
  atlas?: CompareAtlas | null;
  userId: string;
  artists: CloudArtistData[];
  onAtlasChange: (atlas: CompareAtlas | null) => void;
  onDismiss: () => void;
}) {
  const [search, setSearch] = useState('');
  const [friendId, setFriendId] = useState('');
  const profilesQuery = useQuery({
    queryKey: ['cloud-compare-profiles', search],
    queryFn: () => searchProfiles(search, 8),
    enabled: visible && search.trim().length >= 2,
  });
  const compareQuery = useQuery({
    queryKey: ['cloud-compare-atlas', userId, friendId, artists],
    queryFn: () => fetchCompareAtlas(userId, friendId, artists),
    enabled: visible && !!friendId,
  });
  useEffect(() => {
    onAtlasChange(compareQuery.data ?? null);
  }, [compareQuery.data, onAtlasChange]);

  return (
    <Sheet
      visible={visible}
      title="Compare atlases"
      onDismiss={onDismiss}
      snapPoints={['55%']}
    >
      <View style={styles.content}>
        <TextInput
          accessibilityLabel="Search for a friend to compare atlases"
          placeholder="Search friends by username"
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setFriendId('');
            onAtlasChange(null);
          }}
          autoCapitalize="none"
          style={styles.search}
        />
        {profilesQuery.isError ? (
          <Text variant="caption" color="danger">
            {profilesQuery.error.message}
          </Text>
        ) : null}
        {profilesQuery.data
          ?.filter(
            (profile) =>
              profile.id !== userId && profile.follow_status === 'accepted',
          )
          .map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={`Compare with ${profile.display_name ?? profile.username}`}
              accessibilityState={{ selected: friendId === profile.id }}
              onPress={() => {
                setFriendId(profile.id);
                onAtlasChange(null);
              }}
              style={styles.friend}
            >
              <Text variant="body" weight="semibold">
                {profile.display_name ?? profile.username}
              </Text>
              <Text variant="caption" color="secondary">
                @{profile.username}
              </Text>
            </Pressable>
          ))}
        {compareQuery.isFetching ? (
          <Text variant="caption" color="secondary">
            Finding the shared ink…
          </Text>
        ) : null}
        {compareQuery.isError ? (
          <Text variant="caption" color="danger">
            Atlas comparison is unavailable. Check that you can view this
            friend’s atlas and try again. {compareQuery.error.message}
          </Text>
        ) : null}
        {compareQuery.data ? (
          <>
            <Text variant="title" weight="bold">
              {compareQuery.data.tasteOverlapPercent}% taste overlap
            </Text>
            <Text variant="label" weight="bold">
              Territories only you explored
            </Text>
            <Text variant="body">
              {compareQuery.data.territoriesOnlyYou
                .map(posterTerritoryLabel)
                .join(', ') || 'None yet'}
            </Text>
            <Text variant="label" weight="bold">
              Territories only they explored
            </Text>
            <Text variant="body">
              {compareQuery.data.territoriesOnlyFriend
                .map(posterTerritoryLabel)
                .join(', ') || 'None yet'}
            </Text>
          </>
        ) : atlas ? (
          <>
            <Text variant="title" weight="bold">
              {atlas.tasteOverlapPercent}% taste overlap
            </Text>
            <Text variant="label" weight="bold">
              Territories only you explored
            </Text>
            <Text variant="body">
              {atlas.territoriesOnlyYou.map(posterTerritoryLabel).join(', ') ||
                'None yet'}
            </Text>
            <Text variant="label" weight="bold">
              Territories only they explored
            </Text>
            <Text variant="body">
              {atlas.territoriesOnlyFriend.map(posterTerritoryLabel).join(', ') ||
                'None yet'}
            </Text>
          </>
        ) : !friendId ? (
          <>
            <Text variant="title" weight="bold">
              Trace a shared listening map
            </Text>
            <Text variant="body" color="secondary">
              Friend stickers will use dashed ink; shared artists will be filled
              and joined by a dashed string.
            </Text>
            <Text variant="caption" color="secondary">
              Artist overlap is read through user_cloud_data and common_artists;
              access remains enforced by Supabase RLS.
            </Text>
          </>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingHorizontal: 24 },
  search: { borderWidth: 1, minHeight: 44, paddingHorizontal: 12 },
  friend: {
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
