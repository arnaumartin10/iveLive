import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, ExternalLink, Music2, Plus, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Text } from '../../components/ui/Text';
import { useAuthStore } from '../auth/store';
import type { ConcertWithRelations } from '../concerts/types';
import {
  fetchConcertSetlist,
  fetchSetlistFmById,
  saveConcertSetlist,
  type ConcertSetlist,
} from './api';
import {
  detectAndParseSetlist,
  setlistFmResponseToParsed,
  type ParsedSetlist,
  type ParsedSetlistSong,
  type SongMedal,
} from './parse';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, spacing } from '../../theme/tokens';

type Props = {
  concert?: ConcertWithRelations;
  editable: boolean;
  logContext?: {
    artistName: string | null;
    eventDate: string;
    venueName: string;
  };
  onSelect?: (setlist: ParsedSetlist) => void;
};

const queryKey = (logId: string) => ['concert-setlist', logId] as const;

export function SetlistImportPanel({
  concert,
  editable,
  logContext,
  onSelect,
}: Props) {
  const { colors } = useTheme();
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [pasted, setPasted] = useState('');
  const [songText, setSongText] = useState('');
  const [draft, setDraft] = useState<ParsedSetlist | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [selectedSongIndex, setSelectedSongIndex] = useState<number | null>(
    null,
  );
  const savedQuery = useQuery({
    queryKey: queryKey(concert?.id ?? 'new-log'),
    queryFn: () =>
      concert ? fetchConcertSetlist(concert.id) : Promise.resolve(null),
    enabled: Boolean(concert),
  });
  const saveMutation = useMutation({
    mutationFn: async (setlist: ParsedSetlist) => {
      if (!userId) throw new Error('Sign in to save this setlist.');
      if (!concert)
        throw new Error('This setlist is not attached to a saved show yet.');
      await saveConcertSetlist(concert.id, userId, setlist);
    },
    onSuccess: async () => {
      if (concert) {
        await queryClient.invalidateQueries({
          queryKey: queryKey(concert.id),
        });
      }
      setVisible(false);
      setDraft(null);
      setPasted('');
    },
    onError: (error) =>
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save this setlist.',
      ),
  });
  const medalMutation = useMutation({
    mutationFn: async ({
      logId,
      ownerId,
      setlist,
    }: {
      logId: string;
      ownerId: string;
      setlist: ParsedSetlist;
    }) => saveConcertSetlist(logId, ownerId, setlist),
    onSuccess: async (_data, variables) => {
      if (concert) {
        queryClient.setQueryData(
          queryKey(concert.id),
          (current: ConcertSetlist | null | undefined) =>
            current
              ? {
                  ...current,
                  songs: variables.setlist.songs,
                  updated_at: new Date().toISOString(),
                }
              : current,
        );
      }
      setErrorMessage(null);
    },
    onError: (error) =>
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not save this song medal.',
      ),
  });
  const savedSongs = useMemo(() => {
    const raw = savedQuery.data?.songs;
    if (!Array.isArray(raw)) return [];
    const songs = raw.flatMap((item) =>
      typeof item === 'object' &&
      item !== null &&
      'title' in item &&
      typeof item.title === 'string'
        ? [
            {
              title: item.title,
              setName:
                'setName' in item && typeof item.setName === 'string'
                  ? item.setName
                  : null,
              encore: 'encore' in item && item.encore === true,
              medal:
                'medal' in item && isSongMedal(item.medal) ? item.medal : null,
            },
          ]
        : [],
    );
    const assignedMedals = new Set<SongMedal>();
    return songs.map((song) => {
      if (!song.medal || !assignedMedals.has(song.medal)) {
        if (song.medal) assignedMedals.add(song.medal);
        return song;
      }
      return { ...song, medal: null };
    });
  }, [savedQuery.data?.songs]);
  const activeSongIndex = selectedSongIndex;
  const selectedSong =
    activeSongIndex === null ? undefined : savedSongs[activeSongIndex];

  function updateSongMedal(index: number, medal: SongMedal) {
    const savedSetlist = savedQuery.data;
    if (!concert || !userId || !savedSetlist || !editable) return;
    const currentSong = savedSongs[index];
    if (!currentSong) return;
    const removingMedal = currentSong.medal === medal;
    const songs: ParsedSetlistSong[] = savedSongs.map((song, songIndex) => ({
      ...song,
      medal: removingMedal
        ? songIndex === index
          ? null
          : song.medal
        : songIndex === index
          ? medal
          : song.medal === medal
            ? null
            : song.medal,
    }));
    medalMutation.mutate({
      logId: concert.id,
      ownerId: userId,
      setlist: {
        artist: savedSetlist.artist,
        venue: savedSetlist.venue,
        city: savedSetlist.city,
        eventDate: savedSetlist.event_date,
        eventYear: savedSetlist.event_year,
        source: savedSetlist.source as ParsedSetlist['source'],
        sourceUrl: savedSetlist.source_url,
        setlistId: savedSetlist.setlistfm_id,
        songs,
      },
    });
  }
  async function chooseFile() {
    setErrorMessage(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/csv', 'application/json', 'text/*'],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      const content = asset.file
        ? await asset.file.text()
        : await new File(asset.uri).text();
      setPasted(content);
      await prepareImport(content);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not read that setlist file.',
      );
    }
  }

  function startManualEntry() {
    setErrorMessage(null);
    setWarnings([]);
    setDraft({
      artist: concert?.artist?.name ?? logContext?.artistName ?? null,
      venue: concert?.venue_name ?? logContext?.venueName ?? null,
      city: null,
      eventDate: concert?.event_date ?? logContext?.eventDate ?? null,
      eventYear:
        Number((concert?.event_date ?? logContext?.eventDate)?.slice(0, 4)) ||
        null,
      source: 'manual',
      sourceUrl: null,
      setlistId: null,
      songs: [],
    });
    setSongText('');
  }

  async function prepareImport(value = pasted) {
    setErrorMessage(null);
    setWarnings([]);
    try {
      const parsed = detectAndParseSetlist(value);
      if (parsed.format !== 'setlistfm') {
        setDraft(parsed.setlist);
        setSongText(parsed.setlist.songs.map((song) => song.title).join('\n'));
        return;
      }

      const fallback: ParsedSetlist = {
        artist: parsed.embed.eventHint.artist,
        venue: parsed.embed.eventHint.venue,
        city: parsed.embed.eventHint.city,
        eventDate: null,
        eventYear: parsed.embed.eventHint.year,
        source: 'setlistfm',
        sourceUrl: parsed.embed.sourceUrl,
        setlistId: parsed.embed.setlistId,
        songs: [],
      };
      setDraft(fallback);
      setSongText('');
      setWarnings(parsed.embed.warnings);

      setIsLookingUp(true);
      try {
        const response = await fetchSetlistFmById(parsed.embed.setlistId);
        const imported = setlistFmResponseToParsed(response, parsed.embed);
        setDraft(imported);
        setSongText(imported.songs.map((song) => song.title).join('\n'));
        setWarnings([
          ...parsed.embed.warnings,
          ...compareSetlistToLog(
            imported,
            concert ?? {
              event_date: logContext?.eventDate ?? '',
              artist: { name: logContext?.artistName ?? null },
            },
          ),
        ]);
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message
            : 'The request could not be completed.';
        setWarnings([
          ...parsed.embed.warnings,
          `Songs could not be fetched: ${detail} You can still paste, upload, or type the songs.`,
        ]);
      } finally {
        setIsLookingUp(false);
      }
    } catch (error) {
      setDraft(null);
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not read that setlist.',
      );
    }
  }

  function updateSongDraft(value: string) {
    if (!draft) return;
    const existingSets = new Map(
      draft.songs.map((song, index) => [index, song]),
    );
    const songs = value
      .split(/\r?\n/)
      .map((title, index) => {
        const previous = existingSets.get(index);
        return {
          title: title.trim(),
          setName: previous?.setName ?? null,
          encore: previous?.encore ?? false,
          medal: previous?.medal ?? null,
        };
      })
      .filter((song) => song.title);
    setDraft({ ...draft, songs });
  }

  const eventLink = draft?.sourceUrl;
  function handleSaveDraft() {
    if (!draft) return;
    if (!concert) {
      onSelect?.(draft);
      setVisible(false);
      return;
    }
    saveMutation.mutate(draft);
  }

  return (
    <View style={styles.section}>
      {concert && savedQuery.error ? (
        <Text variant="caption" color="danger">
          Could not load the saved setlist: {savedQuery.error.message}
        </Text>
      ) : null}
      {concert && savedQuery.data ? (
        <Card style={styles.savedCard}>
          <View style={styles.savedHeader}>
            <Music2 size={18} color={colors.ink} />
            <Text variant="subtitle" style={styles.flex}>
              Setlist · {savedSongs.length} songs
            </Text>
          </View>
          <Text variant="overline" color="secondary">
            FULL SETLIST
          </Text>
          <View style={styles.songList}>
            {savedSongs.map((song, index) => (
              <Pressable
                key={`${index}-${song.title}`}
                accessibilityRole={editable ? 'button' : undefined}
                accessibilityLabel={
                  editable
                    ? `${selectedSongIndex === index ? 'Selected' : 'Choose'} a medal for ${song.title}`
                    : undefined
                }
                accessibilityState={
                  editable
                    ? { selected: selectedSongIndex === index }
                    : undefined
                }
                onPress={
                  editable
                    ? () =>
                        setSelectedSongIndex((current) =>
                          current === index ? null : index,
                        )
                    : undefined
                }
                style={[
                  styles.songRow,
                  {
                    borderBottomColor: colors.line,
                    backgroundColor:
                      selectedSongIndex === index
                        ? colors.surfaceRaised
                        : colors.surface,
                  },
                ]}
              >
                <Text
                  variant="mono"
                  color="secondary"
                  style={styles.songNumber}
                >
                  {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={styles.songCopy}>
                  {song.setName ? (
                    <Text variant="overline" color="secondary">
                      {song.setName}
                    </Text>
                  ) : null}
                  <Text variant="body" weight="semibold">
                    {song.title}
                  </Text>
                  {song.encore ? (
                    <Text variant="mono" color="accent">
                      ENCORE
                    </Text>
                  ) : null}
                  {song.medal ? <SongMedalBadge medal={song.medal} /> : null}
                </View>
              </Pressable>
            ))}
          </View>
          {editable && activeSongIndex !== null && selectedSong ? (
            <View
              style={[
                styles.medalPicker,
                {
                  borderColor: colors.ink,
                  backgroundColor: colors.surfaceRaised,
                },
              ]}
            >
              <Text variant="label">Pick a medal for {selectedSong.title}</Text>
              <View style={styles.medalRow}>
                {MEDALS.map((medal) => (
                  <SongMedalButton
                    key={medal}
                    medal={medal}
                    selected={selectedSong.medal === medal}
                    disabled={medalMutation.isPending}
                    onPress={() => {
                      updateSongMedal(activeSongIndex, medal);
                      setSelectedSongIndex(null);
                    }}
                  />
                ))}
              </View>
            </View>
          ) : null}
          {medalMutation.isPending ? (
            <Text variant="mono" color="secondary">
              SAVING MEDAL…
            </Text>
          ) : null}
          {errorMessage ? (
            <Text variant="caption" color="danger">
              {errorMessage}
            </Text>
          ) : null}
          {savedQuery.data.source === 'setlistfm' ? (
            <Attribution url={savedQuery.data.source_url} />
          ) : null}
          {editable ? (
            <Button
              label="Edit setlist"
              size="sm"
              variant="secondary"
              onPress={() => {
                setDraft({
                  artist: savedQuery.data?.artist ?? null,
                  venue: savedQuery.data?.venue ?? null,
                  city: savedQuery.data?.city ?? null,
                  eventDate: savedQuery.data?.event_date ?? null,
                  eventYear: savedQuery.data?.event_year ?? null,
                  source:
                    (savedQuery.data?.source as ParsedSetlist['source']) ??
                    'manual',
                  sourceUrl: savedQuery.data?.source_url ?? null,
                  setlistId: savedQuery.data?.setlistfm_id ?? null,
                  songs: savedSongs.map((song) => ({
                    ...song,
                  })),
                });
                setVisible(true);
              }}
            />
          ) : null}
        </Card>
      ) : editable ? (
        <Button
          label="Import setlist"
          variant="secondary"
          leftIcon={<Music2 size={17} color={colors.ink} />}
          onPress={() => setVisible(true)}
        />
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close setlist importer"
            onPress={() => setVisible(false)}
            style={styles.modalBackdrop}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.ink },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.line }]}
            >
              <Text variant="title">Bring in the setlist</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close setlist importer"
                hitSlop={12}
                onPress={() => setVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text variant="body" color="secondary">
                Paste setlist.fm embed HTML, a link, JSON, CSV, or one song per
                line.
              </Text>

              <Input
                label="PASTE OR TYPE"
                value={pasted}
                onChangeText={setPasted}
                multiline
                autoCapitalize="sentences"
                textAlignVertical="top"
                placeholder="Paste an embed, link, or one song per line"
                style={styles.multiline}
              />
              <View style={styles.actionRow}>
                <View style={styles.action}>
                  <Button
                    label="Upload file"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus size={15} color={colors.ink} />}
                    onPress={() => void chooseFile()}
                  />
                </View>
                <View style={styles.action}>
                  <Button
                    label="Type it in"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Plus size={15} color={colors.ink} />}
                    onPress={startManualEntry}
                  />
                </View>
              </View>

              {errorMessage ? (
                <Text variant="caption" color="danger">
                  {errorMessage}
                </Text>
              ) : null}
              {warnings.map((warning) => (
                <Text key={warning} variant="caption" color="warning">
                  {warning}
                </Text>
              ))}

              {draft ? (
                <View
                  style={[
                    styles.preview,
                    {
                      borderColor: colors.ink,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text variant="overline" color="secondary">
                    PREVIEW · EDIT BEFORE SAVING
                  </Text>
                  {draft.artist ? (
                    <Text variant="subtitle">{draft.artist}</Text>
                  ) : null}
                  {!draft.artist && !draft.venue && draft.setlistId ? (
                    <Text variant="mono" color="secondary">
                      SETLIST · {draft.setlistId}
                    </Text>
                  ) : null}
                  {[
                    draft.venue,
                    draft.city,
                    draft.eventYear?.toString(),
                    draft.eventDate,
                  ].filter(Boolean).length ? (
                    <Text variant="caption" color="secondary">
                      {[
                        draft.venue,
                        draft.city,
                        draft.eventYear?.toString(),
                        draft.eventDate,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : null}
                  {isLookingUp ? (
                    <Text variant="mono" color="secondary">
                      LOOKING UP SONGS…
                    </Text>
                  ) : (
                    <>
                      {draft.source === 'setlistfm' && !draft.songs.length ? (
                        <>
                          <Text variant="body" color="secondary">
                            The pasted link identifies the setlist, but does not
                            contain its songs. The importer looks them up using
                            setlist.fm&apos;s official API.
                          </Text>
                          {eventLink ? (
                            <Attribution
                              url={eventLink}
                              label="Open on setlist.fm"
                            />
                          ) : null}
                        </>
                      ) : null}
                      <Input
                        label="SONGS · ONE PER LINE"
                        value={songText}
                        onChangeText={(value) => {
                          setSongText(value);
                          updateSongDraft(value);
                        }}
                        multiline
                        textAlignVertical="top"
                        placeholder="Type or paste one song per line"
                        style={styles.songInput}
                      />
                    </>
                  )}
                  {draft.source === 'setlistfm' && draft.songs.length ? (
                    <Attribution url={draft.sourceUrl} />
                  ) : null}
                  <Button
                    label={concert ? 'Save setlist' : 'Use this setlist'}
                    loading={saveMutation.isPending || isLookingUp}
                    disabled={!draft.songs.length || isLookingUp}
                    onPress={handleSaveDraft}
                  />
                </View>
              ) : null}

              {pasted.trim() ? (
                <Button
                  label="Read setlist"
                  variant="primary"
                  loading={isLookingUp}
                  onPress={() => void prepareImport()}
                />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Attribution({
  url,
  label = 'Setlist via setlist.fm',
}: {
  url: string | null;
  label?: string;
}) {
  if (!url) return null;
  return <AttributionLink url={url} label={label} />;
}

const MEDALS: SongMedal[] = ['gold', 'silver', 'bronze'];

function isSongMedal(value: unknown): value is SongMedal {
  return value === 'gold' || value === 'silver' || value === 'bronze';
}

function medalLabel(medal: SongMedal): string {
  return medal.charAt(0).toUpperCase() + medal.slice(1);
}

function SongMedalButton({
  medal,
  selected,
  disabled,
  onPress,
}: {
  medal: SongMedal;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const color =
    medal === 'gold'
      ? colors.accent
      : medal === 'silver'
        ? colors.inkMuted
        : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Remove' : 'Assign'} ${medal} medal`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.medalButton,
        {
          borderColor: selected ? color : colors.line,
          backgroundColor: selected ? colors.surfaceRaised : colors.surface,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Award size={13} color={color} fill={selected ? color : 'transparent'} />
      <Text variant="mono" style={{ color, fontSize: 11 }}>
        {medalLabel(medal)}
      </Text>
    </Pressable>
  );
}

function SongMedalBadge({ medal }: { medal: SongMedal }) {
  const { colors } = useTheme();
  const color =
    medal === 'gold'
      ? colors.accent
      : medal === 'silver'
        ? colors.inkMuted
        : colors.ink;
  return (
    <View
      style={[
        styles.medalBadge,
        { borderColor: color, backgroundColor: colors.surfaceRaised },
      ]}
    >
      <Award size={14} color={color} fill={color} />
      <Text variant="mono" style={{ color, fontSize: 11 }}>
        {medalLabel(medal)}
      </Text>
    </View>
  );
}

function AttributionLink({ url, label }: { url: string; label: string }) {
  const { colors } = useTheme();
  async function openLink() {
    try {
      await Linking.openURL(url);
    } catch {
      const message =
        'Could not open that setlist.fm link. Try again in a moment.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(message);
      } else {
        Alert.alert('Link unavailable', message);
      }
    }
  }
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => void openLink()}
      style={styles.attribution}
    >
      <Text
        variant="mono"
        style={[styles.attributionText, { color: colors.accentText }]}
      >
        {label}
      </Text>
      <ExternalLink size={14} color={colors.accentText} />
    </Pressable>
  );
}

export function compareSetlistToLog(
  imported: ParsedSetlist,
  concert: {
    event_date: string;
    artist: { name: string | null } | null;
  },
): string[] {
  const warnings: string[] = [];
  const importedArtist = normalizeName(imported.artist);
  const loggedArtist = normalizeName(concert.artist?.name ?? null);
  if (importedArtist && loggedArtist && importedArtist !== loggedArtist) {
    warnings.push(
      `This setlist is for ${imported.artist}, but your log is for ${concert.artist?.name}.`,
    );
  }
  if (imported.eventDate && concert.event_date !== imported.eventDate) {
    warnings.push(
      `This setlist is for ${formatDate(imported.eventDate)} but your log says ${formatDate(concert.event_date)}.`,
    );
  }
  return warnings;
}

function normalizeName(value: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalCard: {
    maxHeight: '90%',
    minHeight: '55%',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  modalHeader: {
    minHeight: 64,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: { padding: spacing.xs },
  savedCard: { gap: spacing.sm },
  savedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  songList: { gap: 0 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  songNumber: { minWidth: 26, paddingTop: 2 },
  songCopy: { flex: 1, gap: spacing.xs },
  medalPicker: {
    gap: spacing.md,
    borderWidth: 2,
    padding: spacing.md,
    ...hardShadow.sm,
  },
  medalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  medalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  medalBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  flex: { flex: 1 },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  multiline: { minHeight: 112, paddingTop: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  preview: {
    borderWidth: 2,
    padding: spacing.md,
    gap: spacing.sm,
    ...hardShadow.md,
  },
  songInput: { minHeight: 150, paddingTop: spacing.sm },
  attribution: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  attributionText: { textDecorationLine: 'underline' },
});
