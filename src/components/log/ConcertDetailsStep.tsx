import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';
import { palette, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import { ArtistAvatar } from '@components/ui/ArtistAvatar';
import type { SpotifyArtistSearchResult } from '@features/spotify/types';

const detailsStepSchema = z.object({
  venue_name: z.string().min(1, 'Venue name is required'),
  venue_city: z.string().min(1, 'City is required'),
  venue_country: z.string().min(1, 'Country is required'),
  concert_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
});

type DetailsStepValues = z.infer<typeof detailsStepSchema>;

interface ConcertDetailsStepProps {
  artist: SpotifyArtistSearchResult;
  initialValues: {
    venue_name: string;
    venue_city: string;
    venue_country: string;
    concert_date: string;
  };
  onBack: () => void;
  onNext: (data: DetailsStepValues) => void;
}

export function ConcertDetailsStep({
  artist,
  initialValues,
  onBack,
  onNext,
}: ConcertDetailsStepProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsStepValues>({
    resolver: zodResolver(detailsStepSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (data: DetailsStepValues) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onNext(data);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.artistBanner}>
        <ArtistAvatar name={artist.name} imageUrl={artist.image_url} size={64} />
        <View style={styles.artistMeta}>
          <Text variant="overline" color="crimson">
            SELECTED ARTIST
          </Text>
          <Text variant="title" weight="bold">
            {artist.name}
          </Text>
        </View>
      </View>

      <Text variant="headline" weight="bold" style={styles.title}>
        Where & When?
      </Text>

      <Controller
        control={control}
        name="venue_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Venue or Festival Name *"
            placeholder="e.g. Razzmatazz, Primavera Sound..."
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.venue_name?.message}
          />
        )}
      />

      <View style={styles.row}>
        <View style={styles.halfCol}>
          <Controller
            control={control}
            name="venue_city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="City *"
                placeholder="e.g. Barcelona"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.venue_city?.message}
              />
            )}
          />
        </View>

        <View style={styles.halfCol}>
          <Controller
            control={control}
            name="venue_country"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Country *"
                placeholder="e.g. Spain"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.venue_country?.message}
              />
            )}
          />
        </View>
      </View>

      <Controller
        control={control}
        name="concert_date"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Date (YYYY-MM-DD) *"
            placeholder="YYYY-MM-DD"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.concert_date?.message}
            helperText="When did this performance take place?"
          />
        )}
      />

      <View style={styles.buttonsRow}>
        <Button
          label="Back"
          variant="secondary"
          size="md"
          onPress={onBack}
          style={styles.backButton}
        />
        <Button
          label="Next: Memories"
          variant="primary"
          size="md"
          onPress={handleSubmit(onSubmit)}
          style={styles.nextButton}
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
  artistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface1,
    borderRadius: spacing[4],
    padding: spacing[3],
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: palette.border,
  },
  artistMeta: {
    marginLeft: spacing[3],
    flex: 1,
  },
  title: {
    marginBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfCol: {
    flex: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[6],
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
