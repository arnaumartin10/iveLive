import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { CalendarDays, X } from 'lucide-react-native';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { VenueLabel } from '../paper/GenreLabel';
import { Toast } from '../ui/Toast';
import { ArtistSearch } from '../../features/artists/ArtistSearch';
import { useEnsureArtist } from '../../features/artists/hooks';
import { CustomArtistForm } from '../../features/artists/CustomArtistForm';
import { VENUE_TYPE_ORDER } from '../../features/venues/venueTypes';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { wishlistEditorSchema } from '../../features/profile/logic';
import type {
  ArtistRow,
  ArtistSearchResult,
} from '../../features/artists/types';
import type { WishlistDraft, WishlistItem } from '../../features/profile/types';

function draftFromItem(item?: WishlistItem | null): WishlistDraft {
  return {
    artist_id: item?.artist_id ?? '',
    event_name: item?.event_name ?? '',
    venue_name: item?.venue_name ?? '',
    city: item?.city ?? '',
    target_date: item?.target_date ?? null,
    date_flexible: item?.date_flexible ?? true,
    venue_type: item?.venue_type ?? null,
    priority: item?.priority ?? 2,
    note: item?.note ?? '',
    status: item?.status ?? 'wanted',
    ticket_url: item?.ticket_url ?? null,
  };
}

export function WishlistEditorSheet({
  visible,
  initialItem,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  initialItem?: WishlistItem | null;
  onDismiss: () => void;
  onSave: (draft: WishlistDraft) => Promise<void>;
}) {
  const { colors } = useTheme();
  const ensureArtist = useEnsureArtist();
  const [draft, setDraft] = useState(() => draftFromItem(initialItem));
  const [artistName, setArtistName] = useState(initialItem?.artist_name ?? '');
  const [artistImage, setArtistImage] = useState(
    initialItem?.image_url ?? null,
  );
  const [searching, setSearching] = useState(!initialItem);
  const [manualArtistQuery, setManualArtistQuery] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof WishlistDraft>(key: K, value: WishlistDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function chooseArtist(result: ArtistSearchResult) {
    try {
      const artist = await ensureArtist.mutateAsync(result);
      set('artist_id', artist.id);
      setArtistName(artist.name);
      setArtistImage(artist.image_url_thumb ?? artist.image_url_large);
      setSearching(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save artist.',
      );
    }
  }

  function chooseManualArtist(artist: ArtistRow) {
    set('artist_id', artist.id);
    setArtistName(artist.name);
    setArtistImage(artist.image_url_thumb ?? artist.image_url_large);
    setManualArtistQuery(null);
    setSearching(false);
  }

  async function save() {
    setError('');
    const parsed = wishlistEditorSchema.safeParse({
      ...draft,
      ticket_url: draft.ticket_url ?? '',
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? 'Check the wishlist details.',
      );
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...parsed.data,
        ticket_url: parsed.data.ticket_url || null,
      });
      onDismiss();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save wishlist item.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={initialItem ? 'Edit wishlist item' : 'Add to wishlist'}
      snapPoints={['72%', '92%']}
      useScrollableContent
      onDismiss={onDismiss}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {manualArtistQuery != null ? (
          <View style={styles.manualPanel}>
            <CustomArtistForm
              initialName={manualArtistQuery}
              onSuccess={chooseManualArtist}
              onCancel={() => setManualArtistQuery(null)}
            />
          </View>
        ) : draft.artist_id && !searching ? (
          <View
            style={[
              styles.selectedArtist,
              { backgroundColor: colors.surfaceRaised },
            ]}
          >
            <Text variant="label" weight="bold" style={styles.flexOne}>
              {artistName}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change artist"
              onPress={() => setSearching(true)}
              style={styles.changeArtist}
            >
              <Text
                variant="caption"
                weight="semibold"
                style={{ color: colors.accent }}
              >
                Change
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.searchWrap}>
            <ArtistSearch
              onSelectArtist={(result) => void chooseArtist(result)}
              onAddManually={(query) => setManualArtistQuery(query)}
              placeholder="Search artists"
              autoFocus={!initialItem}
            />
          </View>
        )}
        {artistImage ? (
          <Text variant="caption" color="secondary">
            Artist selected: {artistName}
          </Text>
        ) : null}

        <Field
          label="Event name (optional)"
          value={draft.event_name}
          onChangeText={(value) => set('event_name', value)}
          placeholder="Primavera Sound 2027"
        />
        <Field
          label="Venue"
          value={draft.venue_name}
          onChangeText={(value) => set('venue_name', value)}
          placeholder="Venue name"
        />
        <Field
          label="City"
          value={draft.city}
          onChangeText={(value) => set('city', value)}
          placeholder="City"
        />

        <View style={[styles.dateToggle, { borderColor: colors.line }]}>
          <View style={styles.flexOne}>
            <Text variant="label" weight="semibold">
              Flexible / unknown date
            </Text>
            <Text variant="caption" color="secondary">
              Keep the date open or enter a target date.
            </Text>
          </View>
          <Switch
            value={draft.date_flexible}
            onValueChange={(value) => set('date_flexible', value)}
          />
        </View>
        {!draft.date_flexible ? (
          <Field
            label="Target date (YYYY-MM-DD)"
            value={draft.target_date ?? ''}
            onChangeText={(value) => set('target_date', value || null)}
            placeholder="2027-06-04"
            keyboardType="numbers-and-punctuation"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => set('target_date', null)}
            style={styles.dateClear}
          >
            <CalendarDays size={16} color={colors.inkMuted} />
            <Text variant="caption" color="secondary">
              Date TBD
            </Text>
            {draft.target_date ? <X size={15} color={colors.inkMuted} /> : null}
          </Pressable>
        )}

        <Text variant="label" weight="bold">
          Venue type
        </Text>
        <View style={styles.optionsRow}>
          {VENUE_TYPE_ORDER.map((type) => {
            const selected = draft.venue_type === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => set('venue_type', selected ? null : type)}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? colors.accent : colors.line,
                    backgroundColor: selected
                      ? `${colors.accent}20`
                      : colors.surface,
                  },
                ]}
              >
                <VenueLabel
                  venue={type}
                  size="xs"
                  variant={selected ? 'solid' : 'outline'}
                />
              </Pressable>
            );
          })}
        </View>

        <Text variant="label" weight="bold">
          Priority
        </Text>
        <View style={styles.optionsRow}>
          {([1, 2, 3] as const).map((priority) => (
            <Pressable
              key={priority}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.priority === priority }}
              onPress={() => set('priority', priority)}
              style={[
                styles.option,
                {
                  borderColor:
                    draft.priority === priority ? colors.warning : colors.line,
                  backgroundColor:
                    draft.priority === priority
                      ? `${colors.warning}18`
                      : colors.surface,
                },
              ]}
            >
              <Text
                variant="caption"
                weight="semibold"
                style={{
                  color:
                    draft.priority === priority
                      ? colors.warning
                      : colors.inkMuted,
                }}
              >
                {priority === 1
                  ? 'Must-see'
                  : priority === 2
                    ? 'Want'
                    : 'Maybe'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="Ticket link (https://)"
          value={draft.ticket_url ?? ''}
          onChangeText={(value) => set('ticket_url', value || null)}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
        />
        <Field
          label="Note"
          value={draft.note}
          onChangeText={(value) => set('note', value)}
          placeholder="A note to yourself"
          multiline
          maxLength={300}
        />
        {error ? (
          <Toast
            visible
            message={error}
            variant="danger"
            onDismiss={() => setError('')}
          />
        ) : null}
        <Button
          label={saving ? 'Saving…' : 'Save wishlist item'}
          loading={saving}
          disabled={saving || !draft.artist_id}
          onPress={() => void save()}
        />
      </BottomSheetScrollView>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numbers-and-punctuation' | 'url';
  autoCapitalize?: 'none' | 'sentences';
  maxLength?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="caption" weight="semibold" color="secondary">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        maxLength={maxLength}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.noteInput,
          {
            borderColor: colors.line,
            backgroundColor: colors.surface,
            color: colors.ink,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: spacing.md,
    maxWidth: 560,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    width: '100%',
  },
  searchWrap: { height: 280 },
  manualPanel: { minHeight: 420 },
  selectedArtist: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  changeArtist: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  flexOne: { flex: 1 },
  field: { gap: spacing.xs },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noteInput: { minHeight: 88 },
  dateToggle: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 64,
    padding: spacing.sm,
  },
  dateClear: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  option: {
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
