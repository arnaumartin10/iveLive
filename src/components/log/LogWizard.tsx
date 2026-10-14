import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { palette } from '@theme/tokens';
import { useLogWizardStore } from '@features/log/store';
import { useLogConcert } from '@features/concerts/hooks';
import { useAuthStore } from '@features/auth/store';
import { ArtistSearchStep } from './ArtistSearchStep';
import { ConcertDetailsStep } from './ConcertDetailsStep';
import { ReviewStep } from './ReviewStep';
import { SuccessCelebration } from './SuccessCelebration';

interface LogWizardProps {
  onDismiss: () => void;
}

export function LogWizard({ onDismiss }: LogWizardProps) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? 'demo-user-id';

  const {
    currentStep,
    selectedArtist,
    venueName,
    venueCity,
    venueCountry,
    concertDate,
    notes,
    rating,
    setStep,
    selectArtist,
    setVenueDetails,
    setConcertDate,
    setMemories,
    resetWizard,
  } = useLogWizardStore();

  const logConcertMutation = useLogConcert(userId);

  const handleDetailsNext = (data: {
    venue_name: string;
    venue_city: string;
    venue_country: string;
    concert_date: string;
  }) => {
    setVenueDetails({
      name: data.venue_name,
      city: data.venue_city,
      country: data.venue_country,
    });
    setConcertDate(data.concert_date);
    setStep('memories');
  };

  const handleReviewSubmit = async (memories: {
    notes: string;
    rating: number | null;
  }) => {
    if (!selectedArtist) return;

    setMemories(memories);

    try {
      await logConcertMutation.mutateAsync({
        artist_name: selectedArtist.name,
        spotify_artist_id: selectedArtist.spotify_id.startsWith('custom_')
          ? null
          : selectedArtist.spotify_id,
        venue_name: venueName,
        venue_city: venueCity,
        venue_country: venueCountry,
        concert_date: concertDate,
        notes: memories.notes,
        rating: memories.rating,
      });

      setStep('success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save concert';
      Alert.alert('Error Logging Concert', msg);
    }
  };

  const handleFinish = () => {
    resetWizard();
    onDismiss();
  };

  return (
    <View style={styles.container}>
      {currentStep === 'artist' && (
        <ArtistSearchStep onSelectArtist={selectArtist} />
      )}

      {currentStep === 'details' && selectedArtist && (
        <ConcertDetailsStep
          artist={selectedArtist}
          initialValues={{
            venue_name: venueName,
            venue_city: venueCity,
            venue_country: venueCountry,
            concert_date: concertDate,
          }}
          onBack={() => setStep('artist')}
          onNext={handleDetailsNext}
        />
      )}

      {currentStep === 'memories' && selectedArtist && (
        <ReviewStep
          artist={selectedArtist}
          venueName={venueName}
          venueCity={venueCity}
          venueCountry={venueCountry}
          concertDate={concertDate}
          initialNotes={notes}
          initialRating={rating}
          isSubmitting={logConcertMutation.isPending}
          onBack={() => setStep('details')}
          onSubmit={handleReviewSubmit}
        />
      )}

      {currentStep === 'success' && selectedArtist && (
        <SuccessCelebration artist={selectedArtist} onDone={handleFinish} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface0,
  },
});
