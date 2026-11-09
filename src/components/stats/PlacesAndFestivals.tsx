import { Building2, MapPin, PartyPopper } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import type { VenueCityStat, VenueDeepStats } from '../../features/stats/types';
import { VENUE_TYPES } from '../../features/venues/venueTypes';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { VenueLabel } from '../paper';

type PlacesAndFestivalsProps = {
  data: VenueDeepStats | undefined;
  isLoading: boolean;
  error?: string;
  onOpenVenue: (venue: { venueId: string | null; name: string }) => void;
  onOpenCity: (city: string, country: string | null) => void;
  onRetry: () => void;
};

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="label" weight="bold">
      {children}
    </Text>
  );
}

function CityRow({
  city,
  onPress,
}: {
  city: VenueCityStat;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${city.city} timeline, ${city.log_count} shows`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cityRow,
        { borderBottomColor: colors.line, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <MapPin size={17} color={colors.accent} />
      <View style={styles.rowCopy}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {city.city}
          {city.country ? `, ${city.country}` : ''}
        </Text>
        <Text variant="caption" color="secondary">
          {city.venue_count} {city.venue_count === 1 ? 'place' : 'places'}
        </Text>
      </View>
      <Text variant="caption" color="secondary">
        {city.log_count} {city.log_count === 1 ? 'show' : 'shows'}
      </Text>
    </Pressable>
  );
}

export function PlacesAndFestivals({
  data,
  isLoading,
  error,
  onOpenVenue,
  onOpenCity,
  onRetry,
}: PlacesAndFestivalsProps) {
  const { colors } = useTheme();
  const festivals = data?.festivals;
  const totalMixLogs =
    (festivals?.festival_logs ?? 0) + (festivals?.club_logs ?? 0);
  const festivalShare = totalMixLogs
    ? (festivals?.festival_logs ?? 0) / totalMixLogs
    : 0;
  const clubShare = totalMixLogs ? 1 - festivalShare : 0;

  if (error) {
    return (
      <Card style={styles.card}>
        <Text variant="title" weight="bold">
          Places and festivals could not load
        </Text>
        <Text variant="caption" color="secondary">
          {error}
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text variant="label" weight="semibold" color="accent">
            Retry
          </Text>
        </Pressable>
      </Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card style={styles.card}>
        <Text variant="caption" color="secondary">
          Loading your places and festival history…
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.content}>
      <Card style={styles.card}>
        <SectionTitle>MOST VISITED PLACES</SectionTitle>
        <Text variant="caption" color="secondary">
          All-time totals, independent of the year selected above.
        </Text>
        {data.venues.length ? (
          data.venues.map((venue, index) => {
            const Icon = VENUE_TYPES[venue.venue_type].icon;
            return (
              <Pressable
                key={`${venue.venue_id ?? venue.name}-${venue.venue_type}`}
                accessibilityRole="button"
                accessibilityLabel={`Open ${venue.name} timeline, ${venue.log_count} shows`}
                onPress={() =>
                  onOpenVenue({ venueId: venue.venue_id, name: venue.name })
                }
                style={({ pressed }) => [
                  styles.venueRow,
                  {
                    borderBottomColor: colors.line,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <Text variant="caption" color="secondary" style={styles.rank}>
                  {index + 1}.
                </Text>
                <Icon size={18} color={colors.accent} />
                <View style={styles.rowCopy}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {venue.name}
                  </Text>
                  <Text variant="caption" color="secondary">
                    {venue.log_count} {venue.log_count === 1 ? 'show' : 'shows'}
                  </Text>
                </View>
                <VenueLabel venue={venue.venue_type} size="xs" />
              </Pressable>
            );
          })
        ) : (
          <Text variant="caption" color="secondary">
            Places will appear here as you log shows.
          </Text>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.titleWithIcon}>
          <PartyPopper size={17} color={colors.accent} />
          <SectionTitle>FESTIVALS VS CLUBS</SectionTitle>
        </View>
        {totalMixLogs ? (
          <>
            <View
              accessibilityLabel={`${festivals?.festival_logs ?? 0} festival shows, ${festivals?.club_logs ?? 0} club shows`}
              style={[styles.ratioTrack, { backgroundColor: colors.line }]}
            >
              <View
                style={[
                  styles.ratioSegment,
                  {
                    flex: festivalShare,
                    backgroundColor: VENUE_TYPES.festival.primaryColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.ratioSegment,
                  {
                    flex: clubShare,
                    backgroundColor: VENUE_TYPES.concert_hall_club.primaryColor,
                  },
                ]}
              />
            </View>
            <View style={styles.ratioLegend}>
              <View style={styles.legendItem}>
                <PartyPopper
                  size={16}
                  color={VENUE_TYPES.festival.primaryColor}
                />
                <Text variant="caption" color="secondary">
                  Festivals · {festivals?.festival_logs ?? 0} (
                  {Math.round(festivalShare * 100)}%)
                </Text>
              </View>
              <View style={styles.legendItem}>
                <Building2
                  size={16}
                  color={VENUE_TYPES.concert_hall_club.primaryColor}
                />
                <Text variant="caption" color="secondary">
                  Clubs · {festivals?.club_logs ?? 0} (
                  {Math.round(clubShare * 100)}%)
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text variant="caption" color="secondary">
            Festival and club comparisons will appear as you log shows.
          </Text>
        )}
        <View style={[styles.festivalSummary, { borderTopColor: colors.line }]}>
          <View style={styles.summaryMetric}>
            <Text variant="title" weight="bold">
              {festivals?.distinct_festivals ?? 0}
            </Text>
            <Text variant="caption" color="secondary">
              festivals attended
            </Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text variant="title" weight="bold">
              {festivals?.avg_bands_per_festival_day == null
                ? '—'
                : Number(festivals.avg_bands_per_festival_day).toFixed(1)}
            </Text>
            <Text variant="caption" color="secondary">
              artists logged per festival day
            </Text>
          </View>
        </View>
        {festivals?.top_recurring_festival ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${festivals.top_recurring_festival.name} timeline`}
            onPress={() =>
              onOpenVenue({
                venueId: festivals.top_recurring_festival?.venue_id ?? null,
                name: festivals.top_recurring_festival?.name ?? '',
              })
            }
            style={styles.recurringFestival}
          >
            <Text variant="caption" color="secondary">
              MOST VISITED FESTIVAL
            </Text>
            <Text variant="body" weight="semibold" numberOfLines={1}>
              {festivals.top_recurring_festival.name}
            </Text>
            <Text variant="caption" color="secondary">
              {festivals.top_recurring_festival.log_count}{' '}
              {festivals.top_recurring_festival.log_count === 1
                ? 'show'
                : 'shows'}
            </Text>
          </Pressable>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <View style={styles.titleWithIcon}>
          <MapPin size={17} color={colors.accent} />
          <SectionTitle>CONCERT FOOTPRINT</SectionTitle>
        </View>
        {data.cities.length ? (
          data.cities.map((city) => (
            <CityRow
              key={`${city.city}-${city.country ?? ''}`}
              city={city}
              onPress={() => onOpenCity(city.city, city.country)}
            />
          ))
        ) : (
          <Text variant="caption" color="secondary">
            Add a venue or import a setlist with a city to build your concert
            footprint.
          </Text>
        )}
        {data.countries.length ? (
          <View style={[styles.countries, { borderTopColor: colors.line }]}>
            <Text variant="caption" color="secondary">
              {data.countries
                .map(
                  (country) =>
                    `${country.country} · ${country.log_count} ${country.log_count === 1 ? 'show' : 'shows'}`,
                )
                .join('   ')}
            </Text>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  card: { gap: spacing.md, padding: spacing.md },
  titleWithIcon: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  venueRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingVertical: spacing.xs,
  },
  rank: { textAlign: 'right', width: 24 },
  rowCopy: { flex: 1, gap: 2, minWidth: 0 },
  cityRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    paddingVertical: spacing.xs,
  },
  ratioTrack: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: 12,
    overflow: 'hidden',
  },
  ratioSegment: { height: '100%' },
  ratioLegend: { gap: spacing.sm },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  festivalSummary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  summaryMetric: { flex: 1, gap: 2, minWidth: 0 },
  recurringFestival: {
    borderRadius: radius.sm,
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  countries: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
});
