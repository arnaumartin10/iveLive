import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { routes } from '../../navigation/routes';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Stamp, Sticker } from '../../components/paper';
import { useTheme } from '../../theme/ThemeProvider';
import { cloudExperienceStrings } from './experienceStrings';
import { GenreLabel, VenueLabel } from '../../components/paper/GenreLabel';
import type { MacroGenre } from '../genres/macroGenres';
import type { VenueType } from '../venues/venueTypes';

export type TerritoryCardArtist = { id: string; name: string };
export type TerritoryVenueStamp = {
  id: string;
  label: string;
  venue: VenueType;
};
export type TerritorySubgenre = { slug: string; count: number };

type CloudTerritoryCardProps = {
  genre: MacroGenre;
  label: string;
  unexplored: boolean;
  sharePercent?: number;
  averageRating?: number | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  artists?: TerritoryCardArtist[];
  subgenres?: TerritorySubgenre[];
  venues?: TerritoryVenueStamp[];
  discoveries?: string[];
  discoveriesLoading?: boolean;
  discoveriesUnavailable?: boolean;
  onClose: () => void;
  onLogShow: () => void;
  onOpenArtist: (artist: TerritoryCardArtist) => void;
};

export function CloudTerritoryCard({
  genre,
  label,
  unexplored,
  sharePercent = 0,
  averageRating = null,
  firstSeen = null,
  lastSeen = null,
  artists = [],
  subgenres = [],
  venues = [],
  discoveries = [],
  discoveriesLoading = false,
  discoveriesUnavailable = false,
  onClose,
  onLogShow,
  onOpenArtist,
}: CloudTerritoryCardProps) {
  const { colors } = useTheme();
  return (
    <Card padding={12} style={styles.card}>
      <View style={styles.titleRow}>
        <GenreLabel
          genre={genre}
          label={label}
          size="md"
          variant="stamp"
          interactive={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close territory card"
          onPress={onClose}
          hitSlop={8}
        >
          <Text variant="label">CLOSE</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`About ${label}`}
        hitSlop={8}
        onPress={() =>
          router.navigate(routes.genre(genre))
        }
        style={styles.aboutGenre}
      >
        <Text variant="caption" weight="bold" color="accent">
          About this genre
        </Text>
      </Pressable>
      {unexplored ? (
        <>
          <Stamp
            id={`unexplored-${label}`}
            label={cloudExperienceStrings.territory.unexplored}
            variant="violet"
          />
          <Text variant="caption" color="secondary">
            {cloudExperienceStrings.territory.copy}
          </Text>
          <Button
            label={cloudExperienceStrings.territory.logShow}
            size="sm"
            onPress={onLogShow}
          />
          {discoveriesLoading ? (
            <Text variant="caption" color="secondary">
              Finding a first note...
            </Text>
          ) : null}
          {discoveriesUnavailable ? (
            <Text variant="caption" color="secondary">
              Discover picks are unavailable right now.
            </Text>
          ) : null}
          {discoveries.length > 0 ? (
            <View style={styles.discoveries}>
              <Text variant="mono" weight="bold">
                {cloudExperienceStrings.territory.discover}
              </Text>
              {discoveries.slice(0, 5).map((name, index) => (
                <Text
                  key={`${name}-${index}`}
                  variant="caption"
                  color="secondary"
                >
                  {name}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <>
          {subgenres.length ? (
            <View style={styles.subgenres}>
              <Text variant="mono" weight="bold">
                DISTRICT SOUNDS
              </Text>
              <View style={styles.subgenreLabels}>
                {subgenres.map((item) => (
                  <GenreLabel
                    key={item.slug}
                    genre={item.slug}
                    size="xs"
                    label={`${item.slug.replaceAll('-', ' ')} · ${item.count}`}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.statsRow}>
            <Text variant="mono">
              {cloudExperienceStrings.territory.share} {sharePercent}%
            </Text>
            <Text variant="mono">
              {cloudExperienceStrings.territory.averageRating}{' '}
              {averageRating?.toFixed(1) ?? '—'}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text variant="caption" color="secondary">
              {cloudExperienceStrings.territory.firstSeen} {firstSeen ?? '—'}
            </Text>
            <Text variant="caption" color="secondary">
              {cloudExperienceStrings.territory.lastSeen} {lastSeen ?? '—'}
            </Text>
          </View>
          <View style={styles.artistRow}>
            {artists.slice(0, 3).map((artist) => (
              <Pressable
                key={artist.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${artist.name} artist card`}
                onPress={() => onOpenArtist(artist)}
                style={styles.artist}
              >
                <Sticker id={`territory-${artist.id}`} size={36}>
                  <View
                    style={[
                      styles.artistInitial,
                      { backgroundColor: colors.surfaceRaised },
                    ]}
                  >
                    <Text variant="caption" weight="bold">
                      {artist.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                </Sticker>
                <Text variant="caption" numberOfLines={1}>
                  {artist.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.stampRow}>
            {venues.map((venue) => (
              <VenueLabel
                key={venue.id}
                venue={venue.venue}
                label={venue.label}
                size="xs"
              />
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aboutGenre: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
  },
  subgenres: { gap: 5 },
  subgenreLabels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  artistRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  artist: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 95,
    minHeight: 44,
  },
  artistInitial: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  discoveries: { gap: 4 },
});
