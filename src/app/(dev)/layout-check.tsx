import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CloudExperienceHud } from '../../features/cloud/CloudExperienceHud';
import { TimelineCard } from '../../components/timeline/TimelineCard';
import { GenreLabel, Stamp } from '../../components/paper';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import type { ConcertWithRelations } from '../../features/concerts/types';
import type { SignedLogMedia } from '../../features/media/types';

const media: SignedLogMedia[] = [
  {
    id: 'layout-photo-1',
    log_id: 'layout-log',
    kind: 'image',
    slot: 'concert_photo',
    user_id: 'layout-user',
    storage_path: 'layout/photo-1.jpg',
    thumb_path: 'layout/photo-1-thumb.jpg',
    poster_path: null,
    poster_url: null,
    width: 1200,
    height: 800,
    size_bytes: 0,
    duration_ms: null,
    mime: 'image/jpeg',
    codec: null,
    caption: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'layout-photo-2',
    log_id: 'layout-log',
    kind: 'image',
    slot: 'companions_photo',
    user_id: 'layout-user',
    storage_path: 'layout/photo-2.jpg',
    thumb_path: 'layout/photo-2-thumb.jpg',
    poster_path: null,
    poster_url: null,
    width: 1200,
    height: 800,
    size_bytes: 0,
    duration_ms: null,
    mime: 'image/jpeg',
    codec: null,
    caption: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'layout-video-3',
    log_id: 'layout-log',
    kind: 'video',
    slot: 'concert_video',
    user_id: 'layout-user',
    storage_path: 'layout/video-3.mp4',
    thumb_path: 'layout/video-3-thumb.jpg',
    poster_path: null,
    poster_url: null,
    width: 1920,
    height: 1080,
    size_bytes: 0,
    duration_ms: 12000,
    mime: 'video/mp4',
    codec: null,
    caption: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const sampleLog = {
  id: 'layout-log',
  artist_id: 'layout-artist',
  user_id: 'layout-user',
  event_date: '2026-01-01',
  venue_type: 'festival',
  venue_name:
    'Auditori Internacional de Barcelona amb un nom molt llarg per comprovar el salt de línia',
  rating: 4.5,
  review:
    'Una nit increïble amb una energia espectacular. La banda va tocar x12 el tema que més ens agrada i encara vam tenir un bis llarg. Una noche inolvidable con muchísima gente cantando cada canción.',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  artist: {
    id: 'layout-artist',
    spotify_id: null,
    name: 'The Extremely Long Artist Name That Should Wrap Across Two Lines Without Clipping',
    name_normalized: 'long artist',
    image_url_large: null,
    image_url_thumb: null,
    genres: ['rock'],
    macro_genres: ['rock'],
    sub_genres: [],
    banner_image_url: null,
    begin_year: null,
    begin_year_source: null,
    bio: null,
    bio_attribution: null,
    bio_lang: null,
    bio_source: null,
    bio_url: null,
    enriched_at: null,
    enrichment_error: null,
    enrichment_status: 'complete',
    group_image_url: null,
    is_on_tour: false,
    last_enrichment_requested_at: null,
    lastfm_tags: [],
    musicbrainz_id: null,
    primary_macro: 'rock',
    popularity: null,
    public_avg_rating: null,
    public_rating_count: 0,
    public_weighted_rating: null,
    source: 'manual',
    created_by: null,
    last_synced_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    tour_end_date: null,
    tour_last_checked_at: null,
    tour_start_date: null,
    user_edited_fields: [],
    wikidata_id: null,
    wikipedia_title: null,
  },
  media,
} satisfies ConcertWithRelations;

export default function LayoutCheckScreen() {
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { backgroundColor: colors.bg }]}
    >
      <Text variant="display">Layout check</Text>
      <Text variant="caption" color="secondary">
        Long-text fixtures · Catalan · Spanish · three media items · x12 repeats
      </Text>

      <View style={styles.section}>
        <Text variant="label" weight="bold">
          DIARY ROW / LOG SUMMARY
        </Text>
        <TimelineCard
          concert={sampleLog}
          primaryGenreColor={colors.accent}
          onPress={() => undefined}
          onOpenArtist={() => undefined}
        />
      </View>

      <View style={styles.section}>
        <Text variant="label" weight="bold">
          ARTIST / GENRE LABELS
        </Text>
        <Text variant="title" weight="bold">
          {sampleLog.artist?.name}
        </Text>
        <GenreLabel genre="rock" size="md" interactive={false} />
        <Stamp label="YOU WENT TOO" tilt={false} />
      </View>

      <View style={styles.section}>
        <Text variant="label" weight="bold">
          CLOUD CONTROLS
        </Text>
        <CloudExperienceHud
          exploredCount={9}
          menuVisible={menuVisible}
          motionEnabled
          soundEnabled={false}
          legendVisible
          onFly={() => undefined}
          onToggleMenu={() => setMenuVisible((value) => !value)}
          onCloseMenu={() => setMenuVisible(false)}
          onReplay={() => undefined}
          onToggleMotion={() => undefined}
          onToggleSound={() => undefined}
          onToggleLegend={() => undefined}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    gap: 20,
    maxWidth: 720,
    padding: 16,
    paddingBottom: 48,
    width: '100%',
  },
  section: { gap: 12, minWidth: 0 },
});
