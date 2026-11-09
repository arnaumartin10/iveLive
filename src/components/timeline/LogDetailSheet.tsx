import React, { useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Calendar, Edit3, MapPin, Trash2 } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GenreLabel } from '../paper/GenreLabel';
import { Pill } from '../ui/Pill';
import { Sheet } from '../ui/Sheet';
import { StarRating } from '../ui/StarRating';
import { Text } from '../ui/Text';
import { getPrimaryGenreInfo } from './timelineGrouping';
import type { ConcertWithRelations } from '../../features/concerts/types';
import { useOptionalArtistCard } from '../../features/artists/ArtistCardProvider';
import { KeepsakeFrames } from '../media/KeepsakeFrames';
import { SetlistImportPanel } from '../../features/setlist/SetlistImportPanel';
import { ShareConcertButton } from '../log/ShareConcertButton';

interface LogDetailSheetProps {
  concert: ConcertWithRelations | null;
  visible: boolean;
  editable?: boolean;
  undoableDelete?: boolean;
  onDismiss: () => void;
  onEdit: (concert: ConcertWithRelations) => void;
  onDelete: (id: string) => void;
}

export function LogDetailSheet({
  concert,
  visible,
  editable = true,
  undoableDelete = false,
  onDismiss,
  onEdit,
  onDelete,
}: LogDetailSheetProps) {
  const { colors } = useTheme();
  const artistCard = useOptionalArtistCard();
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  if (!concert) return null;

  const artistName = concert.artist?.name || 'Unknown Artist';
  const artistPhoto =
    concert.artist?.image_url_thumb || concert.artist?.image_url_large;
  const genreInfo = getPrimaryGenreInfo(concert);

  let formattedDate = concert.event_date;
  try {
    formattedDate = format(parseISO(concert.event_date), 'EEEE, MMMM d, yyyy');
  } catch {
    // fallback
  }

  function confirmDelete() {
    if (!concert) return;
    const message = `Are you sure you want to remove your show for "${artistName}"? ${
      undoableDelete
        ? 'You can undo this deletion for five seconds.'
        : 'This action cannot be undone.'
    }`;
    const removeLog = () => {
      onDismiss();
      onDelete(concert.id);
    };
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Delete concert log?\n\n${message}`)
      ) {
        removeLog();
      }
      return;
    }
    Alert.alert(
      'Delete concert log?',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: removeLog },
      ],
      { cancelable: true },
    );
  }

  return (
    <Sheet
      visible={visible}
      onDismiss={onDismiss}
      snapPoints={['92%']}
      enableDynamicSizing={false}
      useScrollableContent
    >
      <BottomSheetScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" weight="bold">
          Concert Details
        </Text>
        <KeepsakeFrames
          logId={concert.id}
          mode={editable ? 'edit' : 'view'}
          media={concert.media}
        />
        <SetlistImportPanel concert={concert} editable={editable} />

        {/* Artist Header */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${artistName} artist card`}
          onPress={() => {
            if (!concert.artist_id) return;
            onDismiss();
            if (artistCard) {
              void artistCard.openArtistCard({
                artistId: concert.artist_id,
                name: concert.artist?.name,
                imageUrl:
                  concert.artist?.image_url_thumb ||
                  concert.artist?.image_url_large ||
                  undefined,
                macroGenres: concert.artist?.macro_genres ?? [],
                genres: concert.artist?.genres ?? [],
              });
            } else {
              router.navigate(routes.artist(concert.artist_id));
            }
          }}
          style={styles.artistHeader}
        >
          <View
            style={[
              styles.avatarRing,
              {
                borderColor: genreInfo.color,
                shadowColor: genreInfo.color,
              },
            ]}
          >
            <Avatar imageUrl={artistPhoto} name={artistName} size="lg" />
          </View>
          <View style={styles.artistMeta}>
            <Text variant="title" weight="bold" numberOfLines={2}>
              {artistName}
            </Text>
            <View style={styles.genreBadgeWrap}>
              <GenreLabel
                genre={genreInfo.slug}
                label={genreInfo.label}
                size="xs"
              />
            </View>
          </View>
        </Pressable>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          {/* Date Row */}
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${colors.accent}15` },
              ]}
            >
              <Calendar size={16} color={colors.accent} />
            </View>
            <View style={styles.rowContent}>
              <Text variant="caption" color="secondary">
                Date
              </Text>
              <Text variant="body" weight="semibold">
                {formattedDate}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          {/* Venue Row */}
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${colors.accent}15` },
              ]}
            >
              <MapPin size={16} color={colors.accent} />
            </View>
            <View style={styles.rowContent}>
              <Text variant="caption" color="secondary">
                Venue
              </Text>
              <Text variant="body" weight="semibold">
                {concert.venue_name || 'Venue not specified'}
              </Text>
              {concert.venue_type ? (
                <View style={styles.venuePillWrap}>
                  <Pill venueType={concert.venue_type} />
                </View>
              ) : null}
            </View>
          </View>

          {/* Rating Row */}
          {concert.rating ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: colors.line }]}
              />
              <View style={styles.row}>
                <View style={styles.rowContent}>
                  <Text variant="caption" color="secondary">
                    Rating
                  </Text>
                  <View style={styles.ratingRow}>
                    <StarRating value={concert.rating} size={16} />
                    <Text
                      variant="body"
                      weight="bold"
                      style={{ color: colors.accent }}
                    >
                      {concert.rating.toFixed(1)} / 5.0
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}

          {/* Notes / Review */}
          {concert.review ? (
            <>
              <View
                style={[styles.divider, { backgroundColor: colors.line }]}
              />
              <View style={styles.notesWrap}>
                <Text variant="caption" color="secondary">
                  Notes & Memories
                </Text>
                <Text variant="body" style={styles.notesBody}>
                  {concert.review}
                </Text>
              </View>
            </>
          ) : null}
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {editable ? (
            <Button
              label="Edit log"
              variant="primary"
              leftIcon={<Edit3 size={16} color={colors.accentInk} />}
              onPress={() => {
                onDismiss();
                onEdit(concert);
              }}
            />
          ) : null}
          <View style={styles.secondaryActionsRow}>
            <View style={styles.secondaryBtnWrap}>
              <ShareConcertButton
                logId={concert.id}
                artistName={artistName}
                imageUri={
                  concert.artist?.image_url_large ?? artistPhoto ?? null
                }
                macroGenre={
                  concert.artist?.primary_macro ??
                  concert.artist?.macro_genres[0] ??
                  null
                }
                genreColor={genreInfo.color}
                eventDate={concert.event_date}
                venueName={concert.venue_name}
                rating={concert.rating}
                review={concert.review}
                showWhatsApp={false}
                onError={(message) => {
                  setShareStatus(null);
                  setShareError(message);
                }}
                onStatus={(message) => {
                  setShareError(null);
                  setShareStatus(message || null);
                }}
              />
            </View>
            {editable ? (
              <View style={styles.secondaryBtnWrap}>
                <Button
                  label="Delete"
                  variant="danger"
                  leftIcon={<Trash2 size={16} color={colors.accentInk} />}
                  onPress={confirmDelete}
                />
              </View>
            ) : null}
          </View>
          {shareError ? (
            <Text variant="caption" color="danger">
              {shareError}
            </Text>
          ) : null}
          {shareStatus ? (
            <Text variant="caption" color="secondary">
              {shareStatus}
            </Text>
          ) : null}
        </View>
      </BottomSheetScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  sheetScroll: { flex: 1 },
  artistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarRing: {
    borderRadius: 36,
    borderWidth: 2.5,
    padding: 2,
  },
  artistMeta: {
    flex: 1,
    gap: 6,
  },
  genreBadgeWrap: {
    flexDirection: 'row',
  },
  infoCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  venuePillWrap: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  notesWrap: {
    gap: 6,
  },
  notesBody: {
    lineHeight: 22,
    fontStyle: 'italic',
  },
  actionsContainer: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryBtnWrap: {
    flex: 1,
  },
});
