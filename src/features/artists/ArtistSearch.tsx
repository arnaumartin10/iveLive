import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { AlertCircle, Search, X } from 'lucide-react-native';
import { useArtistSearch } from './hooks';
import { useOptionalArtistCard } from './ArtistCardProvider';
import { ArtistSearchResultRow } from './ArtistSearchResultRow';
import { AddManuallyRow } from './AddManuallyRow';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, spacing } from '../../theme/tokens';
import type { ArtistSearchResult } from './types';

interface ArtistSearchProps {
  onSelectArtist: (artist: ArtistSearchResult) => void;
  onAddManually: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ArtistSearch({
  onSelectArtist,
  onAddManually,
  placeholder = 'Search artists (e.g. Radiohead, Rosalía)...',
  autoFocus = false,
}: ArtistSearchProps) {
  const { colors } = useTheme();
  const artistCard = useOptionalArtistCard();
  const [query, setQuery] = useState('');
  const { results, isLoading, rateLimited, error } = useArtistSearch(query);

  const hasQuery = query.trim().length >= 2;

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.line,
          },
        ]}
      >
        <Search color={colors.inkMuted} size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.input, { color: colors.ink }]}
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <X color={colors.inkMuted} size={16} />
          </Pressable>
        ) : null}
      </View>

      {/* Surface Error Banner */}
      {error ? (
        <View
          style={[
            styles.errorNotice,
            { backgroundColor: `${colors.danger}18`, borderColor: `${colors.danger}44` },
          ]}
        >
          <AlertCircle color={colors.danger} size={16} />
          <Text variant="caption" color="danger" style={styles.errorNoticeText}>
            {error}
          </Text>
        </View>
      ) : null}

      {/* Rate limited warning if Spotify limit reached */}
      {rateLimited ? (
        <View
          style={[styles.rateLimitNotice, { backgroundColor: `${colors.accent}18` }]}
        >
          <Text variant="caption" color="secondary">
            Spotify search is temporarily busy. Manual and local artists are still available.
          </Text>
        </View>
      ) : null}

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.source}-${item.spotifyId ?? item.artistId ?? item.name}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ArtistSearchResultRow
            result={item}
            onPress={onSelectArtist}
            onOpenDetails={artistCard ? (artist) => void artistCard.openArtistCard(artist) : undefined}
          />
        )}
        ListFooterComponent={
          hasQuery ? (
            <AddManuallyRow
              query={query}
              onPress={() => onAddManually(query)}
            />
          ) : null
        }
        ListEmptyComponent={
          hasQuery && !isLoading ? (
            <View style={styles.emptyContainer}>
              {error ? (
                <>
                  <Text variant="label" weight="bold" color="danger" center>
                    Could not search artists
                  </Text>
                  <Text
                    variant="caption"
                    color="secondary"
                    center
                    style={styles.emptyErrorSub}
                  >
                    {error}
                  </Text>
                </>
              ) : (
                <Text variant="caption" color="secondary" center>
                  No artists found matching &ldquo;{query}&rdquo;
                </Text>
              )}
            </View>
          ) : !hasQuery ? (
            <View style={styles.promptContainer}>
              <Text variant="caption" color="secondary" center>
                Type at least 2 characters to search artists.
              </Text>
              <AddManuallyRow
                query=""
                onPress={() => onAddManually('')}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorNoticeText: {
    flex: 1,
    lineHeight: 16,
  },
  emptyErrorSub: {
    marginTop: 4,
    maxWidth: 280,
    alignSelf: 'center',
  },
  rateLimitNotice: {
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyContainer: {
    paddingVertical: 20,
  },
  promptContainer: {
    gap: 12,
    paddingVertical: 24,
  },
});
