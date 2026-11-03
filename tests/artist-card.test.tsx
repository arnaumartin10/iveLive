import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { ArtistCardContent } from '../src/features/artists/ArtistCardContent';
import { router } from 'expo-router';
import type {
  ArtistRow,
  ArtistWithAlbums,
} from '../src/features/artists/types';
import type { ConcertWithRelations } from '../src/features/concerts/types';

jest.mock('../src/features/genres/catalog', () => ({
  ...jest.requireActual<typeof import('../src/features/genres/catalog')>(
    '../src/features/genres/catalog',
  ),
  useGenreCatalog: () => ({ data: [] }),
}));

const mockUseArtist = jest.fn();
const mockUseArtistConcertHistory = jest.fn();
const mockUseArtistFriends = jest.fn();
const mockUseArtistOverride = jest.fn();
const mockUseEnrichArtist = jest.fn();
const mockUseSaveArtistOverride = jest.fn();
const mockUseUserArtistImageOverride = jest.fn();
const mockUseSaveUserArtistImageOverride = jest.fn();
const mockUseReportArtist = jest.fn();
const mockUseArtistManagePermissions = jest.fn();
const mockUseArtistImageGallery = jest.fn();
const mockUseArtistRatingSummary = jest.fn();
const mockUseArtistTourDates = jest.fn();
const mockDeleteConcert = jest.fn();
const mockStartEdit = jest.fn();
const mockResetLogDraft = jest.fn();
const mockSetLogArtist = jest.fn();
const mockGoToDateStep = jest.fn();

jest.mock('../src/features/artists/hooks', () => ({
  useArtist: (...args: unknown[]) => mockUseArtist(...args),
  useArtistImageGallery: (...args: unknown[]) =>
    mockUseArtistImageGallery(...args),
  useArtistFriends: (...args: unknown[]) => mockUseArtistFriends(...args),
  useArtistOverride: (...args: unknown[]) => mockUseArtistOverride(...args),
  useEnrichArtist: (...args: unknown[]) => mockUseEnrichArtist(...args),
  useSaveArtistOverride: (...args: unknown[]) =>
    mockUseSaveArtistOverride(...args),
  useUserArtistImageOverride: (...args: unknown[]) =>
    mockUseUserArtistImageOverride(...args),
  useSaveUserArtistImageOverride: (...args: unknown[]) =>
    mockUseSaveUserArtistImageOverride(...args),
  useReportArtist: (...args: unknown[]) => mockUseReportArtist(...args),
  useArtistManagePermissions: (...args: unknown[]) =>
    mockUseArtistManagePermissions(...args),
  useCreateManualArtist: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateManualArtist: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('../src/features/home/hooks', () => ({
  useArtistRatingSummary: (...args: unknown[]) =>
    mockUseArtistRatingSummary(...args),
  useArtistTourDates: (...args: unknown[]) => mockUseArtistTourDates(...args),
}));

jest.mock('../src/features/concerts/hooks', () => ({
  useArtistConcertHistory: (...args: unknown[]) =>
    mockUseArtistConcertHistory(...args),
  useDeleteConcert: () => ({ mutate: mockDeleteConcert }),
}));

jest.mock('../src/features/auth/store', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'viewer-id' } }),
}));

jest.mock('../src/features/log/store', () => ({
  useLogDraft: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      startEdit: mockStartEdit,
      reset: mockResetLogDraft,
      setArtist: mockSetLogArtist,
      goNext: mockGoToDateStep,
    }),
}));

jest.mock('../src/components/ui/Sheet', () => {
  const { View, Text } = require('react-native');
  return {
    Sheet: ({
      visible,
      title,
      children,
    }: {
      visible: boolean;
      title?: string;
      children: React.ReactNode;
    }) =>
      visible ? (
        <View>
          {title ? <Text>{title}</Text> : null}
          {children}
        </View>
      ) : null,
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  const Image = ({
    accessibilityLabel,
    style,
  }: {
    accessibilityLabel?: string;
    style?: unknown;
  }) => (
    <View accessible accessibilityLabel={accessibilityLabel} style={style} />
  );
  Image.prefetch = jest.fn(async () => true);
  return {
    Image,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

const albums: ArtistWithAlbums['albums'] = Array.from(
  { length: 5 },
  (_, index) => ({
    id: `album-${index}`,
    artist_id: 'artist-1',
    title: `Record ${index + 1}`,
    year: 2018 + index,
    cover_url: `https://example.test/cover-${index}.jpg`,
    cover_thumb_url: `https://example.test/thumb-${index}.jpg`,
    musicbrainz_release_group_id: `release-group-${index}`,
    type: 'album',
    sort_order: index,
    created_at: '2026-01-01T00:00:00.000Z',
  }),
);

const fullArtist: ArtistWithAlbums = {
  id: 'artist-1',
  spotify_id: 'spotify-1',
  name: 'The Example Band',
  name_normalized: 'the example band',
  image_url_large: 'https://example.test/profile.jpg',
  image_url_thumb: 'https://example.test/profile-thumb.jpg',
  genres: ['indie rock', 'dream pop', 'alternative'],
  macro_genres: ['indie', 'rock'],
  sub_genres: [],
  primary_macro: 'indie',
  is_on_tour: false,
  public_avg_rating: null,
  public_rating_count: 0,
  public_weighted_rating: null,
  tour_end_date: null,
  tour_last_checked_at: null,
  tour_start_date: null,
  popularity: null,
  source: 'spotify',
  created_by: null,
  last_synced_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  bio: 'A group biography with enough detail to support the full artist card.',
  bio_source: 'wikipedia',
  bio_url: 'https://en.wikipedia.org/wiki/The_Example_Band',
  bio_lang: 'en',
  bio_attribution: 'CC BY-SA',
  group_image_url: 'https://example.test/banner.jpg',
  banner_image_url: null,
  musicbrainz_id: null,
  wikidata_id: null,
  wikipedia_title: 'The Example Band',
  lastfm_tags: [],
  enrichment_status: 'done',
  enrichment_error: null,
  enriched_at: '2026-01-01T00:00:00.000Z',
  last_enrichment_requested_at: null,
  user_edited_fields: [],
  begin_year: 2012,
  begin_year_source: 'musicbrainz',
  albums,
};

const concert: ConcertWithRelations = {
  id: 'concert-1',
  user_id: 'viewer-id',
  artist_id: 'artist-1',
  event_date: '2025-06-12',
  venue_type: 'festival',
  venue_name: 'Open Air Stage',
  rating: 4.5,
  review: 'A brilliant set from the first song to the encore.',
  created_at: '2025-06-12T21:00:00.000Z',
  updated_at: '2025-06-12T21:00:00.000Z',
  artist: fullArtist,
};

function configureQueries(artist: ArtistWithAlbums | null) {
  mockUseArtist.mockReturnValue({
    data: artist,
    isLoading: false,
    isError: !artist,
    error: null,
    refetch: jest.fn(),
  });
  mockUseArtistConcertHistory.mockReturnValue({
    data: artist ? [concert] : [],
    isLoading: false,
  });
  mockUseArtistFriends.mockReturnValue({
    data: [
      {
        id: 'friend-log-1',
        user_id: 'friend-id',
        event_date: '2025-05-01',
        venue_type: 'stadium',
        venue_name: 'City Stadium',
        rating: 5,
        username: 'friend',
        display_name: 'A Friend',
        avatar_url: null,
      },
    ],
    isLoading: false,
  });
  mockUseArtistOverride.mockReturnValue({ data: null });
  mockUseArtistImageGallery.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUseEnrichArtist.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  mockUseSaveArtistOverride.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  mockUseUserArtistImageOverride.mockReturnValue({
    data: null,
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseSaveUserArtistImageOverride.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  mockUseReportArtist.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  mockUseArtistManagePermissions.mockReturnValue({
    data: {
      isCreator:
        artist?.source === 'manual' && artist?.created_by === 'viewer-id',
      canEdit:
        artist?.source === 'manual' && artist?.created_by === 'viewer-id',
      canDelete:
        artist?.source === 'manual' && artist?.created_by === 'viewer-id',
      otherUserLogCount: 0,
    },
    isLoading: false,
  });
  mockUseArtistRatingSummary.mockReturnValue({
    data: {
      avg_rating: 4.2,
      weighted_rating: 4.1,
      rating_count: 7,
      rater_count: 4,
      histogram: [],
      venue_averages: [{ venue_type: 'festival', average: 4.5, count: 2 }],
      viewer_average: null,
      viewer_count: 0,
    },
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseArtistTourDates.mockReturnValue({
    data: [
      {
        id: 'tour-date-1',
        event_name: 'Summer Tour',
        venue_name: 'Open Air Stage',
        city: 'Barcelona',
        region: null,
        country: 'Spain',
        event_date: '2027-06-12',
        event_end_date: null,
        ticket_url: 'https://tickets.example.test/show',
        status: 'on_sale',
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  });
}

function renderCard(
  artist: ArtistWithAlbums,
  presentation: 'sheet' | 'route' = 'route',
) {
  configureQueries(artist);
  return render(
    <ThemeProvider>
      <ArtistCardContent artistId={artist.id} presentation={presentation} />
    </ThemeProvider>,
  );
}

describe('ArtistCardContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders full artist identity, banner, stats, attribution, albums, history, and friends', () => {
    renderCard(fullArtist);
    expect(screen.getAllByText('The Example Band')).toHaveLength(2);
    expect(
      screen.getByLabelText('The Example Band artist banner'),
    ).toBeTruthy();
    expect(screen.getByText('Your stats')).toBeTruthy();
    expect(screen.getByText('Your concert history')).toBeTruthy();
    expect(screen.getByText('Friends who have seen them')).toBeTruthy();
    expect(screen.getByText('IveLive ratings')).toBeTruthy();
    expect(screen.getByText('Upcoming tour dates')).toBeTruthy();
    expect(screen.getByText('Summer Tour')).toBeTruthy();
    expect(screen.getByText('7 ratings from 4 fans')).toBeTruthy();
    expect(screen.getByText('Record 5')).toBeTruthy();
    expect(screen.getByText('4.5 ★')).toBeTruthy();
  });

  it('lets the viewer select a personal artist photo from existing sources', async () => {
    const saveImages = jest.fn(async () => undefined);
    const view = renderCard(fullArtist);
    mockUseSaveUserArtistImageOverride.mockReturnValue({
      mutateAsync: saveImages,
      isPending: false,
    });
    view.rerender(
      <ThemeProvider>
        <ArtistCardContent artistId={fullArtist.id} presentation="route" />
      </ThemeProvider>,
    );

    fireEvent.press(
      screen.getByLabelText('Choose artist profile photo and banner'),
    );
    fireEvent.press(screen.getByRole('button', { name: 'Profile photo' }));
    expect(screen.getByText('Choose profile photo')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Group photo' }));
      await Promise.resolve();
    });
    expect(screen.queryByText('Choose profile photo')).toBeNull();

    expect(saveImages).toHaveBeenCalledWith({
      artistId: 'artist-1',
      userId: 'viewer-id',
      profileImageUrl: 'https://example.test/banner.jpg',
      bannerImageUrl: null,
    });
  });

  it('shows additional provider gallery images in the banner picker', async () => {
    const saveImages = jest.fn(async () => undefined);
    const view = renderCard(fullArtist);
    mockUseArtistImageGallery.mockReturnValue({
      data: [
        {
          artist_id: 'artist-1',
          image_role: 'banner',
          image_url: 'https://example.test/fanart-2.jpg',
          label: 'Fan art 2',
          sort_order: 2,
          source: 'theaudiodb',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseSaveUserArtistImageOverride.mockReturnValue({
      mutateAsync: saveImages,
      isPending: false,
    });
    view.rerender(
      <ThemeProvider>
        <ArtistCardContent artistId={fullArtist.id} presentation="route" />
      </ThemeProvider>,
    );

    fireEvent.press(
      screen.getByLabelText('Choose artist profile photo and banner'),
    );
    await act(async () => {
      fireEvent.press(
        screen.getByRole('button', { name: 'Fan art 2 · TheAudioDB' }),
      );
      await Promise.resolve();
    });

    expect(saveImages).toHaveBeenCalledWith({
      artistId: 'artist-1',
      userId: 'viewer-id',
      profileImageUrl: null,
      bannerImageUrl: 'https://example.test/fanart-2.jpg',
    });
  });

  it('renders Wikipedia credit and license as the attribution snapshot', () => {
    renderCard(fullArtist);
    expect([
      screen.getByText('From Wikipedia · CC BY-SA').props.children,
      screen.getByText(
        'Artist data from Spotify, MusicBrainz, Last.fm and Wikipedia',
      ).props.children,
    ]).toMatchInlineSnapshot(`
      [
        "From Wikipedia · CC BY-SA",
        "Artist data from Spotify, MusicBrainz, Last.fm and Wikipedia",
      ]
    `);
  });

  it('hides the albums section and shows a quiet no-bio state when data is absent', () => {
    const sparseArtist = {
      ...fullArtist,
      bio: null,
      bio_source: null,
      bio_url: null,
      group_image_url: null,
      banner_image_url: null,
      image_url_large: null,
      image_url_thumb: null,
      albums: [],
    };
    renderCard(sparseArtist);
    expect(screen.getByText('No description yet')).toBeTruthy();
    expect(screen.queryByText('Albums')).toBeNull();
    expect(
      screen.queryByLabelText('The Example Band artist banner'),
    ).toBeNull();
  });

  it('does not render a bio whose stored language is not English', () => {
    renderCard({
      ...fullArtist,
      bio: 'La banda se formó en Barcelona y publicó varios discos.',
      bio_lang: 'ca',
    });
    expect(screen.queryByText(/La banda se formó/)).toBeNull();
    expect(screen.queryByText('From Wikipedia · CC BY-SA')).toBeNull();
    expect(screen.getByText('No description yet')).toBeTruthy();
  });

  it('shows a shimmer instead of empty copy while enrichment is pending', () => {
    renderCard({
      ...fullArtist,
      bio: null,
      albums: [],
      enrichment_status: 'pending',
    });
    expect(screen.getByText('About')).toBeTruthy();
    expect(screen.getByText('Albums')).toBeTruthy();
    expect(screen.queryByText('No description yet')).toBeNull();
  });

  it('supports manual artists with only their available details and shows edit button when viewer is creator', () => {
    renderCard({
      ...fullArtist,
      source: 'manual',
      created_by: 'viewer-id',
      spotify_id: null,
      bio: null,
      albums: [],
    });
    expect(screen.getByText('Custom artist')).toBeTruthy();
    expect(
      screen.queryByLabelText('Open The Example Band in Spotify'),
    ).toBeNull();
    expect(screen.getByText('No description yet')).toBeTruthy();
    const editBtn = screen.getByLabelText('Edit custom artist');
    expect(editBtn).toBeTruthy();
    fireEvent.press(editBtn);
    // Sheet becomes visible
    expect(screen.getByText('Edit The Example Band')).toBeTruthy();
  });

  it('hides edit button on manual artist when viewer is not the creator or someone else logged them', () => {
    mockUseArtistManagePermissions.mockReturnValue({
      data: {
        isCreator: false,
        canEdit: false,
        canDelete: false,
        otherUserLogCount: 2,
      },
      isLoading: false,
    });
    renderCard({
      ...fullArtist,
      source: 'manual',
      created_by: 'other-user',
      spotify_id: null,
      bio: null,
      albums: [],
    });
    expect(screen.getByText('Custom artist')).toBeTruthy();
    expect(screen.queryByLabelText('Edit custom artist')).toBeNull();
  });

  it('navigates to friend log when tapping their avatar in friends who have seen them', () => {
    renderCard(fullArtist);
    const friendBtn = screen.getByLabelText("A Friend's show on 2025-05-01");
    expect(friendBtn).toBeTruthy();
    fireEvent.press(friendBtn);
    expect(router.push).toHaveBeenCalledWith('/log/friend-log-1');
  });

  it('expands review text and opens the album preview sheet', () => {
    renderCard(fullArtist, 'sheet');
    fireEvent.press(screen.getByText('Read review'));
    expect(screen.getByText('Show less')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Preview Record 1, 2018'));
    expect(screen.getAllByText('Record 1').length).toBeGreaterThan(0);
  });

  it('saves a personal genre override without allowing more than three macros', async () => {
    const saveOverride = jest.fn(async () => undefined);
    const view = renderCard(fullArtist);
    mockUseSaveArtistOverride.mockReturnValue({
      mutateAsync: saveOverride,
      isPending: false,
    });
    view.rerender(
      <ThemeProvider>
        <ArtistCardContent artistId={fullArtist.id} presentation="route" />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByText('Not right?'));
    fireEvent.press(screen.getByText('Pop'));
    fireEvent.press(screen.getByText('Electronic'));
    fireEvent.press(screen.getByText('Metal'));
    await act(async () => {
      fireEvent.press(screen.getByText('Save genres'));
      await Promise.resolve();
    });
    expect(saveOverride).toHaveBeenCalledWith({
      userId: 'viewer-id',
      artistId: 'artist-1',
      macroGenres: ['indie', 'rock', 'pop'],
    });
  });

  it('stores a report row through the report mutation', async () => {
    const submitReport = jest.fn(async () => undefined);
    const view = renderCard(fullArtist);
    mockUseReportArtist.mockReturnValue({
      mutateAsync: submitReport,
      isPending: false,
    });
    view.rerender(
      <ThemeProvider>
        <ArtistCardContent artistId={fullArtist.id} presentation="route" />
      </ThemeProvider>,
    );
    fireEvent.press(screen.getByText('Wrong info? Report'));
    fireEvent.changeText(
      screen.getByLabelText('Report details'),
      'The artist image is outdated.',
    );
    await act(async () => {
      fireEvent.press(screen.getByText('Send report'));
      await Promise.resolve();
    });
    expect(submitReport).toHaveBeenCalledWith({
      userId: 'viewer-id',
      artistId: 'artist-1',
      details: 'The artist image is outdated.',
    });
  });

  it('preselects the artist and advances to the date step for Log again', () => {
    renderCard(fullArtist);
    fireEvent.press(screen.getByText('Log again'));
    expect(mockResetLogDraft).toHaveBeenCalled();
    expect(mockSetLogArtist).toHaveBeenCalledWith(fullArtist);
    expect(mockGoToDateStep).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/log');
  });
});
