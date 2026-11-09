import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';
import { ArrowLeft } from 'lucide-react-native';
import { CustomArtistForm } from '../../features/artists/CustomArtistForm';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { ArtistRow, SimilarArtistMatch } from '../../features/artists/types';

export default function CreateCustomArtistScreen() {
  const { colors } = useTheme();
  const safeBack = useSafeBack(routes.fallback.artist());
  const params = useLocalSearchParams<{ initialName?: string }>();

  function handleSuccess(artist: ArtistRow) {
    router.replace(routes.artist(artist.id));
  }

  function handleSelectExisting(match: SimilarArtistMatch) {
    router.replace(routes.artist(match.id));
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={safeBack}
          style={styles.backBtn}
        >
          <ArrowLeft color={colors.ink} size={20} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text variant="title" weight="bold">
            Add Custom Artist
          </Text>
          <Text variant="caption" color="secondary">
            For performers not found on Spotify
          </Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>

      <CustomArtistForm
        initialName={params.initialName ?? ''}
        onSuccess={handleSuccess}
        onCancel={safeBack}
        onSelectExisting={handleSelectExisting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  titleWrap: {
    alignItems: 'center',
    gap: 2,
  },
  headerRightPlaceholder: {
    width: 40,
  },
});
