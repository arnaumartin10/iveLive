import { Pressable, StyleSheet, View } from 'react-native';
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

type CloudTerritoryCardProps = {
  genre: MacroGenre;
  label: string;
  unexplored: boolean;
  sharePercent?: number;
  averageRating?: number | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  artists?: TerritoryCardArtist[];
  venues?: TerritoryVenueStamp[];
  discoveries?: string[];
  discoveriesLoading?: boolean;
  discoveriesUnavailable?: boolean;
  onClose: () => void;
  onLogShow: () => void;
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
  venues = [],
  discoveries = [],
  discoveriesLoading = false,
  discoveriesUnavailable = false,
  onClose,
  onLogShow,
}: CloudTerritoryCardProps) {
  const { colors } = useTheme();
  return (
    <Card padding={12} style={styles.card}>
      <View style={styles.titleRow}>
        <GenreLabel genre={genre} label={label} size="md" variant="stamp" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close territory card"
          onPress={onClose}
          hitSlop={8}
        >
          <Text variant="label">CLOSE</Text>
        </Pressable>
      </View>
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
              <View key={artist.id} style={styles.artist}>
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
              </View>
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  artistRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  artist: { alignItems: 'center', gap: 4, maxWidth: 95 },
  artistInitial: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  discoveries: { gap: 4 },
});
