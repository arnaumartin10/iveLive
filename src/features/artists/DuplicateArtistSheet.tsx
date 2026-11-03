import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Avatar } from '../../components/ui/Avatar';
import { MACRO_GENRES } from '../genres/macroGenres';
import { useTheme } from '../../theme/ThemeProvider';
import type { SimilarArtistMatch } from './types';
import { GenreLabel } from '../../components/paper/GenreLabel';

interface DuplicateArtistSheetProps {
  visible: boolean;
  searchedName: string;
  matches: SimilarArtistMatch[];
  onSelectExisting: (artist: SimilarArtistMatch) => void;
  onCreateAnyway: () => void;
  onDismiss: () => void;
  isCreating?: boolean;
}

export function DuplicateArtistSheet({
  visible,
  searchedName,
  matches,
  onSelectExisting,
  onCreateAnyway,
  onDismiss,
  isCreating = false,
}: DuplicateArtistSheetProps) {
  const { colors } = useTheme();

  return (
    <Sheet
      visible={visible}
      title="Did you mean...?"
      snapPoints={['55%', '85%']}
      onDismiss={onDismiss}
    >
      <View style={styles.container}>
        <View style={styles.headerNotice}>
          <Text variant="body" color="secondary">
            We found{' '}
            {matches.length === 1 ? 'an artist' : `${matches.length} artists`}{' '}
            with a similar name to &ldquo;
            <Text variant="body" weight="bold">
              {searchedName}
            </Text>
            &rdquo;.
          </Text>
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {matches.map((item) => {
            const displayGenres = (item.macroGenres ?? []).slice(0, 2);

            return (
              <Pressable
                key={`${item.source}-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Select existing artist ${item.name}`}
                onPress={() => {
                  void Haptics.selectionAsync();
                  onSelectExisting(item);
                }}
                style={({ pressed }) => [
                  styles.matchRow,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.line,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Avatar
                  name={item.name}
                  imageUrl={item.imageUrlThumb ?? item.imageUrlLarge}
                  size="md"
                />

                <View style={styles.matchDetails}>
                  <View style={styles.nameRow}>
                    <Text
                      variant="label"
                      weight="bold"
                      numberOfLines={1}
                      style={styles.nameText}
                    >
                      {item.name}
                    </Text>
                    <View
                      style={[
                        styles.sourceBadge,
                        { backgroundColor: colors.surfaceRaised },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: colors.ink,
                          fontSize: 10,
                          fontWeight: '700',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.source}
                      </Text>
                    </View>
                  </View>

                  {displayGenres.length > 0 ? (
                    <View style={styles.genresRow}>
                      {displayGenres.map((macro) => {
                        const config =
                          MACRO_GENRES[macro as keyof typeof MACRO_GENRES];
                        if (!config) return null;
                        return (
                          <GenreLabel
                            key={macro}
                            genre={macro as keyof typeof MACRO_GENRES}
                            size="xs"
                            interactive={false}
                          />
                        );
                      })}
                    </View>
                  ) : (
                    <Text variant="caption" color="secondary">
                      {Math.round(item.similarity * 100)}% match
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.selectIconWrap,
                    { backgroundColor: `${colors.accent}14` },
                  ]}
                >
                  <ArrowRight color={colors.accent} size={16} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.line }]}>
          <Button
            label="Create anyway"
            variant="secondary"
            loading={isCreating}
            leftIcon={<Sparkles color={colors.ink} size={16} />}
            onPress={onCreateAnyway}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  headerNotice: {
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  matchRow: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  matchDetails: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  nameText: {
    flexShrink: 1,
  },
  sourceBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  genresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  selectIconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 10,
  },
});
