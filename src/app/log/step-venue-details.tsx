import { ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { History, MapPin } from 'lucide-react-native';
import { WizardStepView } from '../../components/log/WizardStepView';
import { Text } from '../../components/ui/Text';
import { useAuthStore } from '../../features/auth/store';
import { useVenueNameSuggestions } from '../../features/concerts/hooks';
import { useLogDraft } from '../../features/log/store';
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
  const setVenueName = useLogDraft((state) => state.setVenueName);
  const suggestionsQuery = useVenueNameSuggestions(userId, venueType);
  const suggestions = suggestionsQuery.data ?? [];

  return (
    <WizardStepView step={4}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text variant="title" weight="bold">Where did you see them?</Text>
          <Text color="secondary">Add the venue or event name. This is optional.</Text>
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
              placeholder={venueType ? PLACEHOLDERS[venueType] : 'Add a venue or event name'}
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

        {suggestions.length > 0 ? (
          <View style={styles.suggestionsSection}>
            <View style={styles.suggestionsHeading}>
              <History size={15} color={colors.inkMuted} />
              <Text variant="label" color="secondary">Recently used</Text>
            </View>
            <ScrollView
              horizontal
              contentContainerStyle={styles.suggestions}
              showsHorizontalScrollIndicator={false}
            >
              {suggestions.map((name) => {
                const selected = venueName.trim().toLocaleLowerCase() === name.toLocaleLowerCase();
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
                        backgroundColor: selected ? `${colors.accent}18` : colors.surface,
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
  input: { flex: 1, fontFamily: fontFamily.regular, fontSize: 16, minHeight: 52 },
  counter: { alignSelf: 'flex-end' },
  suggestionsSection: { gap: spacing[3] },
  suggestionsHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
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