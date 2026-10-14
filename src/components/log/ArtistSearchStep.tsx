import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Input } from '@components/ui/Input';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import { searchSpotifyArtists } from '@features/spotify/api';
import type { SpotifyArtistSearchResult } from '@features/spotify/types';

interface ArtistSearchStepProps {
  onSelectArtist: (artist: SpotifyArtistSearchResult) => void;
}

export function ArtistSearchStep({ onSelectArtist }: ArtistSearchStepProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyArtistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchSpotifyArtists(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (artist: SpotifyArtistSearchResult) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectArtist(artist);
  };

  return (
    <View style={styles.container}>
      <Text variant="title" weight="bold" style={styles.heading}>
        Who did you see live?
      </Text>
      <Text variant="body" color="secondary" style={styles.subheading}>
        Search artists via Spotify or enter any custom performer name.
      </Text>

      <Input
        placeholder="Search artist name (e.g. Radiohead, Rosalía)..."
        value={query}
        onChangeText={setQuery}
        autoFocus
        returnKeyType="search"
        rightIcon={
          isSearching ? (
            <ActivityIndicator size="small" color={palette.crimson} />
          ) : undefined
        }
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.spotify_id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelect(item)}
            style={({ pressed }) => [
              styles.resultRow,
              pressed && styles.resultRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name}`}
          >
            <ArtistAvatar name={item.name} imageUrl={item.image_url} size={50} />
            <View style={styles.resultDetails}>
              <Text variant="base" weight="bold" style={styles.artistName}>
                {item.name}
              </Text>
              {item.genres.length > 0 && (
                <Text variant="caption" color="secondary" numberOfLines={1}>
                  {item.genres.slice(0, 3).join(' • ')}
                </Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim().length > 0 && !isSearching ? (
            <Pressable
              onPress={() =>
                handleSelect({
                  spotify_id: `custom_${Date.now()}`,
                  name: query.trim(),
                  image_url: null,
                  genres: ['live'],
                })
              }
              style={styles.customAddButton}
            >
              <Text variant="base" color="crimson" weight="bold">
                + Add "{query.trim()}" as a custom artist
              </Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  heading: {
    marginBottom: spacing[1],
  },
  subheading: {
    marginBottom: spacing[4],
  },
  listContent: {
    paddingBottom: spacing[8],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface1,
    padding: spacing[3],
    borderRadius: radius.xl,
    marginBottom: spacing[2],
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 64, // Accessibility: 44pt+ touch target
  },
  resultRowPressed: {
    backgroundColor: palette.surface2,
  },
  resultDetails: {
    flex: 1,
    marginLeft: spacing[3],
  },
  artistName: {
    marginBottom: 2,
  },
  customAddButton: {
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.crimson,
    marginTop: spacing[2],
    minHeight: 52,
  },
});
