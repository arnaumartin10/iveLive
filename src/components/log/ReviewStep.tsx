import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { palette, radius, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import type { SpotifyArtistSearchResult } from '@features/spotify/types';

interface ReviewStepProps {
  artist: SpotifyArtistSearchResult;
  venueName: string;
  venueCity: string;
  venueCountry: string;
  concertDate: string;
  initialNotes: string;
  initialRating: number | null;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (memories: { notes: string; rating: number | null }) => void;
}

export function ReviewStep({
  artist,
  venueName,
  venueCity,
  venueCountry,
  concertDate,
  initialNotes,
  initialRating,
  isSubmitting,
  onBack,
  onSubmit,
}: ReviewStepProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [rating, setRating] = useState<number | null>(initialRating);

  const handleRatingSelect = async (stars: number) => {
    await Haptics.selectionAsync();
    setRating(rating === stars ? null : stars);
  };

  const handleSubmit = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit({ notes, rating });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.summaryCard}>
        <ArtistAvatar name={artist.name} imageUrl={artist.image_url} size={72} />
        <View style={styles.summaryText}>
          <Text variant="title" weight="bold">
            {artist.name}
          </Text>
          <Text variant="caption" color="secondary">
            {venueName} • {venueCity}, {venueCountry}
          </Text>
          <Text variant="overline" color="steel">
            {concertDate}
          </Text>
        </View>
      </View>

      <Text variant="headline" weight="bold" style={styles.title}>
        Memories & Rating
      </Text>

      {/* Star Rating */}
      <View style={styles.ratingSection}>
        <Text variant="label" color="secondary" style={styles.sectionLabel}>
          Rate this performance
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={star}
              onPress={() => handleRatingSelect(star)}
              style={styles.starTouch}
              accessibilityRole="button"
              accessibilityLabel={`${star} stars`}
            >
              <Text
                variant="title"
                weight="black"
                color={rating && star <= rating ? 'amber' : 'muted'}
                style={styles.starText}
              >
                ★
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notes / Thoughts */}
      <Input
        label="Concert Notes or Setlist Memories"
        placeholder="Favorite song performed, who you went with, special moments..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        style={styles.notesInput}
      />

      <View style={styles.buttonsRow}>
        <Button
          label="Back"
          variant="secondary"
          size="md"
          onPress={onBack}
          disabled={isSubmitting}
          style={styles.backButton}
        />
        <Button
          label="Save to Archive"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          onPress={handleSubmit}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[12],
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface1,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryText: {
    marginLeft: spacing[4],
    flex: 1,
  },
  title: {
    marginBottom: spacing[4],
  },
  ratingSection: {
    marginBottom: spacing[6],
  },
  sectionLabel: {
    marginBottom: spacing[2],
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  starTouch: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  starText: {
    fontSize: 24,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[6],
  },
  backButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
