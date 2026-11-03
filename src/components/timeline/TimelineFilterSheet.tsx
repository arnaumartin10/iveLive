import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, RotateCcw, Star } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { useTimelineStore } from '../../features/concerts/timelineStore';
import {
  VENUE_TYPES,
  VENUE_TYPE_ORDER,
} from '../../features/venues/venueTypes';
import {
  MACRO_GENRES,
  MACRO_GENRE_ORDER,
} from '../../features/genres/macroGenres';
import { GenreLabel, VenueLabel } from '../paper/GenreLabel';

interface TimelineFilterSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

const RATING_OPTIONS: { label: string; minRating: number | null }[] = [
  { label: 'Any minimum', minRating: null },
  { label: '3.0+ Stars', minRating: 3.0 },
  { label: '4.0+ Stars', minRating: 4.0 },
  { label: '4.5+ Stars', minRating: 4.5 },
  { label: '5.0 Stars only', minRating: 5.0 },
];
const MAX_RATING_OPTIONS: { label: string; maxRating: number | null }[] = [
  { label: 'Any maximum', maxRating: null },
  { label: 'Up to 3.0', maxRating: 3.0 },
  { label: 'Up to 4.0', maxRating: 4.0 },
  { label: 'Up to 4.5', maxRating: 4.5 },
];

export function TimelineFilterSheet({
  visible,
  onDismiss,
}: TimelineFilterSheetProps) {
  const { colors } = useTheme();
  const filters = useTimelineStore((state) => state.filters);
  const toggleVenueType = useTimelineStore((state) => state.toggleVenueType);
  const toggleGenre = useTimelineStore((state) => state.toggleGenre);
  const setMinRating = useTimelineStore((state) => state.setMinRating);
  const setFilters = useTimelineStore((state) => state.setFilters);
  const resetFilters = useTimelineStore((state) => state.resetFilters);
  const hasActiveFilters = useTimelineStore((state) =>
    state.hasActiveFilters(),
  );
  const activeCount = useTimelineStore((state) => state.activeFilterCount());

  return (
    <Sheet
      visible={visible}
      onDismiss={onDismiss}
      snapPoints={['60%', '90%']}
      title="Filter Concerts"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Venue Types Section */}
        <View style={styles.section}>
          <Text variant="label" weight="bold">
            Venue Type
          </Text>
          <View style={styles.chipsWrap}>
            {VENUE_TYPE_ORDER.map((typeKey) => {
              const def = VENUE_TYPES[typeKey];
              const isSelected = filters.venueTypes.includes(typeKey);

              return (
                <Pressable
                  key={typeKey}
                  accessibilityRole="button"
                  accessibilityLabel={`${def.label} filter`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => toggleVenueType(typeKey)}
                  style={styles.chip}
                >
                  <VenueLabel
                    venue={typeKey}
                    size="xs"
                    variant={isSelected ? 'solid' : 'outline'}
                  />
                  {isSelected ? (
                    <Check size={12} color={colors.ink} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Macro Genres Section */}
        <View style={styles.section}>
          <Text variant="label" weight="bold">
            Genre
          </Text>
          <View style={styles.chipsWrap}>
            {MACRO_GENRE_ORDER.map((genreKey) => {
              const def = MACRO_GENRES[genreKey];
              const isSelected = filters.genres.includes(genreKey);

              return (
                <Pressable
                  key={genreKey}
                  accessibilityRole="button"
                  accessibilityLabel={`${def.label} genre filter`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => toggleGenre(genreKey)}
                  style={styles.chip}
                >
                  <GenreLabel
                    genre={genreKey}
                    size="xs"
                    variant={isSelected ? 'solid' : 'outline'}
                  />
                  {isSelected ? (
                    <Check size={12} color={colors.ink} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Rating Range Section */}
        <View style={styles.section}>
          <Text variant="label" weight="bold">
            Minimum Rating
          </Text>
          <View style={styles.chipsWrap}>
            {RATING_OPTIONS.map((opt) => {
              const isSelected = filters.minRating === opt.minRating;

              return (
                <Pressable
                  key={opt.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.label} rating filter`}
                  onPress={() => {
                    if (opt.minRating === null) {
                      setMinRating(null);
                      return;
                    }
                    setFilters({
                      minRating: opt.minRating,
                      ...(filters.maxRating !== null &&
                      filters.maxRating < opt.minRating
                        ? { maxRating: null }
                        : {}),
                    });
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? `${colors.accent}20`
                        : colors.surfaceRaised,
                      borderColor: isSelected ? colors.accent : colors.line,
                    },
                  ]}
                >
                  {opt.minRating !== null ? (
                    <Star
                      size={13}
                      color={isSelected ? colors.accent : colors.inkMuted}
                      fill={isSelected ? colors.accent : 'transparent'}
                    />
                  ) : null}
                  <Text
                    variant="caption"
                    weight={isSelected ? 'bold' : 'medium'}
                    style={{
                      color: isSelected ? colors.accent : colors.ink,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Check size={12} color={colors.accent} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Text variant="label" weight="bold">
            Maximum Rating
          </Text>
          <View style={styles.chipsWrap}>
            {MAX_RATING_OPTIONS.map((opt) => {
              const isSelected = filters.maxRating === opt.maxRating;
              return (
                <Pressable
                  key={opt.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.label} maximum rating filter`}
                  onPress={() => {
                    if (opt.maxRating === null) {
                      setFilters({ maxRating: null });
                      return;
                    }
                    setFilters({
                      maxRating: opt.maxRating,
                      ...(filters.minRating !== null &&
                      filters.minRating > opt.maxRating
                        ? { minRating: null }
                        : {}),
                    });
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? `${colors.accent}20`
                        : colors.surfaceRaised,
                      borderColor: isSelected ? colors.accent : colors.line,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight={isSelected ? 'bold' : 'medium'}
                    style={{ color: isSelected ? colors.accent : colors.ink }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Check size={12} color={colors.accent} strokeWidth={2.5} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerRow}>
          {hasActiveFilters ? (
            <View style={styles.btnWrap}>
              <Button
                label="Reset all"
                variant="secondary"
                leftIcon={<RotateCcw size={15} color={colors.ink} />}
                onPress={resetFilters}
              />
            </View>
          ) : null}
          <View style={styles.btnWrap}>
            <Button
              label={
                activeCount > 0 ? `Apply Filters (${activeCount})` : 'Done'
              }
              variant="primary"
              onPress={onDismiss}
            />
          </View>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  btnWrap: {
    flex: 1,
  },
});
