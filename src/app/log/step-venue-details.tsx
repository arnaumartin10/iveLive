import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { History, MapPin, Search } from 'lucide-react-native';
import { WizardStepView } from '../../components/log/WizardStepView';
import { Text } from '../../components/ui/Text';
import { useAuthStore } from '../../features/auth/store';
import { useVenueNameSuggestions } from '../../features/concerts/hooks';
import { useLogDraft } from '../../features/log/store';
import { useVenueSearch } from '../../features/venues/hooks';
import { VENUE_TYPES } from '../../features/venues/venueTypes';
import type { VenueType } from '../../features/venues/venueTypes';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, spacing } from '../../theme/tokens';

const PLACEHOLDERS: Record<VenueType, string> = {
  festival: 'e.g. Stage 3 at Mad Cool',
  concert_hall_club: 'e.g. Sala 2 Razzmatazz',
  stadium: 'e.g. Estadi Olímpic Lluís Companys',
  indoor_arena: 'e.g. Palau Sant Jordi',
  festa_major: 'e.g. Festa Major de Gràcia, Plaça del Sol',
  other: 'e.g. The name of the venue or event',
};

export default function StepVenueDetails() {
  const { colors } = useTheme();
  const userId = useAuthStore((state) => state.user?.id ?? '');
  const venueType = useLogDraft((state) => state.venueType);
  const venueName = useLogDraft((state) => state.venueName);
  const venueId = useLogDraft((state) => state.venueId);
  const setVenueName = useLogDraft((state) => state.setVenueName);
  const setVenueSelection = useLogDraft((state) => state.setVenueSelection);
  const suggestionsQuery = useVenueNameSuggestions(userId, venueType);
  const suggestions = suggestionsQuery.data ?? [];
  const searchQuery = useVenueSearch(venueName, venueType);
  const searchResults = searchQuery.data?.results ?? [];
  const hasSearchQuery = venueName.trim().length >= 2;

  return (
    <WizardStepView step={4}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text variant="title" weight="bold">
            Where did you see them?
          </Text>
          <Text color="secondary">
            Add the venue or event name. This is optional.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text variant="label">Venue or event name</Text>
          <View
            style={[
              styles.inputWrap,
              { borderColor: colors.line, backgroundColor: colors.surface },
            ]}
          >
            <MapPin size={18} color={colors.inkMuted} />
            <TextInput
              accessibilityLabel="Venue or event name"
              maxLength={120}
              onChangeText={setVenueName}
              placeholder={
                venueType
                  ? PLACEHOLDERS[venueType]
                  : 'Add a venue or event name'
              }
              placeholderTextColor={colors.inkMuted}
              returnKeyType="done"
              style={[styles.input, { color: colors.ink }]}
              value={venueName}
            />
          </View>
          <Text variant="caption" color="secondary" style={styles.counter}>
            {venueName.length} / 120
          </Text>
        </View>

        {hasSearchQuery ? (
          <View style={styles.searchSection}>
            <View style={styles.searchHeading}>
              <Search size={16} color={colors.inkMuted} />
              <Text variant="label" color="secondary">
                Venue suggestions
              </Text>
              {searchQuery.isFetching ? (
                <ActivityIndicator
                  accessibilityLabel="Searching venues"
                  color={colors.accent}
                  size="small"
                />
              ) : null}
            </View>
            {searchQuery.isError ? (
              <Text variant="caption" color="danger">
                Venue search is not set up yet or is temporarily unavailable.
                You can still use a custom name.
              </Text>
            ) : null}
            {searchQuery.data?.externalUnavailable ? (
              <Text variant="caption" color="secondary">
                Online venue search is temporarily unavailable. Showing any
                saved venues; custom names still work.
              </Text>
            ) : null}
            {searchResults.map((venue) => {
              const Icon = VENUE_TYPES[venue.venueType].icon;
              const location = [venue.city, venue.country]
                .filter(Boolean)
                .join(', ');
              return (
                <Pressable
                  key={venue.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${venue.name}${location ? `, ${location}` : ''}`}
                  accessibilityState={{ selected: venueId === venue.id }}
                  onPress={() => setVenueSelection(venue)}
                  style={({ pressed }) => [
                    styles.result,
                    {
                      backgroundColor:
                        venueId === venue.id
                          ? `${colors.accent}18`
                          : colors.surface,
                      borderColor:
                        venueId === venue.id ? colors.accent : colors.line,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Icon color={colors.accent} size={19} />
                  <View style={styles.resultCopy}>
                    <Text variant="label" numberOfLines={1}>
                      {venue.name}
                    </Text>
                    <Text variant="caption" color="secondary" numberOfLines={1}>
                      {location || VENUE_TYPES[venue.venueType].shortLabel}
                    </Text>
                  </View>
                  <Text variant="caption" color="secondary" numberOfLines={1}>
                    {VENUE_TYPES[venue.venueType].shortLabel}
                  </Text>
                </Pressable>
              );
            })}
            {!searchQuery.isError &&
            !searchQuery.isFetching &&
            searchResults.length === 0 ? (
              <Text variant="caption" color="secondary">
                {searchQuery.data?.externalDeferred
                  ? 'Search is busy. Try again shortly, or use a custom name.'
                  : searchQuery.data?.externalUnavailable
                    ? 'No saved match yet. Try again later or use a custom name.'
                    : 'No matching venues yet.'}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setVenueName(venueName.trim())}
              style={({ pressed }) => [
                styles.customName,
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text variant="caption" color="secondary">
                Can’t find it? Use custom name:{' '}
                <Text weight="semibold">{venueName.trim()}</Text>
              </Text>
            </Pressable>
          </View>
        ) : null}

        {suggestions.length > 0 ? (
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionsHeading}>
              <History size={15} color={colors.inkMuted} />
              <Text variant="label" color="secondary">
                Recently used
              </Text>
            </View>
            <ScrollView
              horizontal
              contentContainerStyle={styles.suggestions}
              showsHorizontalScrollIndicator={false}
            >
              {suggestions.map((name) => {
                const selected =
                  venueName.trim().toLocaleLowerCase() ===
                  name.toLocaleLowerCase();
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${name}`}
                    accessibilityState={{ selected }}
                    onPress={() => setVenueName(name)}
                    style={({ pressed }) => [
                      styles.suggestion,
                      {
                        backgroundColor: selected
                          ? `${colors.accent}18`
                          : colors.surface,
                        borderColor: selected ? colors.accent : colors.line,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <Text variant="caption" weight="semibold" numberOfLines={1}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </WizardStepView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing[6], padding: spacing[4] },
  heading: { gap: spacing[2] },
  fieldGroup: { gap: spacing[2] },
  inputWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 56,
    paddingHorizontal: spacing[3],
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    minHeight: 52,
  },
  counter: { alignSelf: 'flex-end' },
  suggestionsSection: { gap: spacing[3] },
  searchSection: { gap: spacing[2] },
  searchHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 28,
  },
  result: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    minHeight: 58,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  resultCopy: { flex: 1, gap: 2 },
  customName: {
    alignItems: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
  },
  suggestionsHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  suggestions: { gap: spacing[2], paddingRight: spacing[4] },
  suggestion: {
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 240,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
});
