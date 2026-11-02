import type { PropsWithChildren } from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ProfileScreen } from '../src/components/profile/ProfileScreen';
import { WishlistCard } from '../src/components/profile/WishlistCard';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/features/auth/store';
import { useMe } from '../src/features/auth/hooks';
import {
  useProfileOverview,
  useSetPicks,
  useAddWishlistItem,
  useUpdateWishlistItem,
  useDeleteWishlistItem,
  useFullWishlist,
} from '../src/features/profile/hooks';
import {
  useFollow,
  useFollowStatus,
  useUnreadCount,
  useUnfollow,
} from '../src/features/social/hooks';
import type {
  ProfileOverview,
  WishlistItem,
} from '../src/features/profile/types';

jest.mock('../src/features/artists/ArtistCardProvider', () => ({
  useArtistCard: () => ({ openArtistCard: jest.fn() }),
}));

jest.mock('../src/features/profile/hooks', () => ({
  useProfileOverview: jest.fn(),
  useSetPicks: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useAddWishlistItem: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useUpdateWishlistItem: jest.fn(() => ({ mutateAsync: jest.fn() })),
  useDeleteWishlistItem: jest.fn(() => ({ mutate: jest.fn() })),
  useFullWishlist: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  })),
}));

jest.mock('../src/features/auth/hooks', () => ({
  useMe: jest.fn(),
  useUpdateProfile: jest.fn(() => ({ mutateAsync: jest.fn() })),
}));

jest.mock('../src/features/social/hooks', () => ({
  useFollow: jest.fn(),
  useFollowStatus: jest.fn(),
  useUnreadCount: jest.fn(() => ({ data: 0 })),
  useUnfollow: jest.fn(),
}));

jest.mock('../src/features/profile/shareProfileCard', () => ({
  shareProfileCard: async () => undefined,
}));

jest.mock('../src/features/identity', () => ({
  useMusicIdentity: () => ({
    rawData: null,
    computed: null,
    isReady: false,
    isLoading: false,
    isError: false,
  }),
  IdentitySheet: () => null,
}));

jest.mock('../src/components/profile/PickRow', () => ({
  PickRow: ({ pick }: { pick?: { name: string } }) =>
    pick ? <>{pick.name}</> : null,
}));

jest.mock('../src/components/timeline/TimelineScreen', () => ({
  TimelineScreen: () =>
    require('react').createElement(
      require('react-native').Text,
      null,
      'Timeline section content',
    ),
}));

jest.mock('../src/components/profile/ProfileFriendsSection', () => ({
  ProfileFriendsSection: ({ initialSection }: { initialSection: string }) =>
    require('react').createElement(
      require('react-native').Text,
      null,
      `Friends section content (${initialSection})`,
    ),
}));

jest.mock('../src/components/profile/PicksEditorSheet', () => {
  return {
    PicksEditorSheet: ({
      visible,
      list,
    }: {
      visible: boolean;
      list: string;
    }) => {
      if (!visible) return null;
      return require('react').createElement(
        require('react-native').Text,
        null,
        `picks-editor-${list}`,
      );
    },
  };
});

jest.mock('react-native-gesture-handler', () => ({
  Swipeable: ({ children }: PropsWithChildren) => children,
}));

const baseProfile: ProfileOverview = {
  restricted: false,
  profile: {
    id: 'profile-owner',
    username: 'owner',
    display_name: 'Live Fan',
    avatar_url: null,
    bio: 'Here for the encore.',
    is_private: false,
  },
  counts: { shows: 12, artists: 8, followers: 3, following: 5 },
  top_genres: [{ macro_genre: 'indie', show_count: 8, percentage: 66.7 }],
  last_logs: [
    {
      id: 'log-1',
      artist_id: 'artist-1',
      artist_name: 'Radiohead',
      image_url: null,
      event_date: '2026-09-10',
      venue_name: 'Forum',
      rating: 5,
    },
  ],
  five_star_count: 2,
  recent_picks: [
    {
      id: 'artist-1',
      name: 'Radiohead',
      image_url: null,
      macro_genres: ['rock'],
      primary_macro: 'rock',
      position: 1,
      updated_at: new Date().toISOString(),
    },
  ],
  favourite_picks: [],
  wishlist: {
    total: 1,
    items: [
      {
        id: 'wish-1',
        artist_id: 'artist-2',
        artist_name: 'The Cure',
        image_url: null,
        primary_macro: 'rock',
        event_name: null,
        venue_name: null,
        city: null,
        target_date: null,
        date_flexible: true,
        venue_type: null,
        priority: 1,
        note: null,
        status: 'wanted',
        ticket_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  wall_of_fame: [],
  friends: { followers: 3, following: 5, preview: [] },
};
const mockFollowMutate = jest.fn();

function wrapper({ children }: PropsWithChildren) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function setOverview(data: ProfileOverview) {
  jest.mocked(useProfileOverview).mockReturnValue({
    data,
    error: null,
    isError: false,
    isLoading: false,
    isRefetching: false,
    refetch: jest.fn(),
  } as never);
}

describe('profile screen sections', () => {
  beforeEach(() => {
    jest.mocked(router.setParams).mockClear();
    jest.mocked(useLocalSearchParams).mockReturnValue({} as never);
    jest.mocked(useMe).mockReturnValue({
      data: { id: 'profile-owner', username: 'owner' },
      isLoading: false,
    } as never);
    mockFollowMutate.mockReset();
    jest
      .mocked(useFollow)
      .mockReturnValue({ mutate: mockFollowMutate, isPending: false } as never);
    jest
      .mocked(useUnfollow)
      .mockReturnValue({ mutate: jest.fn(), isPending: false } as never);
    jest.mocked(useFollowStatus).mockReturnValue({ data: null } as never);
    jest
      .mocked(useSetPicks)
      .mockReturnValue({ mutateAsync: jest.fn() } as never);
    jest
      .mocked(useAddWishlistItem)
      .mockReturnValue({ mutateAsync: jest.fn() } as never);
    jest
      .mocked(useUpdateWishlistItem)
      .mockReturnValue({ mutateAsync: jest.fn() } as never);
    jest
      .mocked(useDeleteWishlistItem)
      .mockReturnValue({ mutate: jest.fn() } as never);
    useAuthStore.setState({ user: { id: 'profile-owner' } as never });
  });

  it('renders a full profile with picks, wishlist, shows, highlights, and friends', () => {
    setOverview(baseProfile);
    render(<ProfileScreen />, { wrapper });
    expect(screen.getByText('WHAT I’M INTO RECENTLY')).toBeTruthy();
    expect(screen.getByText('MY ALL-TIME FAVOURITES')).toBeTruthy();
    expect(screen.getByText('WISHLIST · WANT TO SEE')).toBeTruthy();
    expect(screen.getByText('RECENT SHOWS')).toBeTruthy();
    expect(screen.getByText('HIGHLIGHTS')).toBeTruthy();
    expect(screen.getAllByText('Friends').length).toBeGreaterThan(0);
    expect(screen.getByText('Radiohead')).toBeTruthy();
    expect(screen.getByText(/Date TBD/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Profile settings'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/settings');
  });

  it('shows empty sections to the owner', () => {
    setOverview({
      ...baseProfile,
      counts: { shows: 0, artists: 0, followers: 0, following: 0 },
      recent_picks: [],
      favourite_picks: [],
      last_logs: [],
      top_genres: [],
      five_star_count: 0,
      wishlist: { total: 0, items: [] },
      wall_of_fame: [],
      friends: { followers: 0, following: 0, preview: [] },
    });
    render(<ProfileScreen />, { wrapper });
    expect(screen.getByText('WHAT I’M INTO RECENTLY')).toBeTruthy();
    expect(screen.getByText('MY ALL-TIME FAVOURITES')).toBeTruthy();
    expect(screen.getByText('Your wishlist is ready')).toBeTruthy();
    expect(screen.getAllByText('Find friends').length).toBeGreaterThan(0);
  });

  it('opens the editor from Add in both pick sections', () => {
    setOverview({ ...baseProfile, recent_picks: [], favourite_picks: [] });
    render(<ProfileScreen />, { wrapper });
    fireEvent.press(screen.getByLabelText('Edit WHAT I’M INTO RECENTLY'));
    expect(screen.getByText('picks-editor-recent')).toBeTruthy();
  });

  it('hides empty sections for a visitor', () => {
    useAuthStore.setState({ user: { id: 'visitor' } as never });
    setOverview({
      ...baseProfile,
      counts: { shows: 0, artists: 0, followers: 0, following: 0 },
      recent_picks: [],
      favourite_picks: [],
      last_logs: [],
      top_genres: [],
      five_star_count: 0,
      wishlist: { total: 0, items: [] },
      wall_of_fame: [],
      friends: { followers: 0, following: 0, preview: [] },
    });
    render(<ProfileScreen />, { wrapper });
    expect(screen.queryByText('WHAT I’M INTO RECENTLY')).toBeNull();
    expect(screen.queryByText('WISHLIST · WANT TO SEE')).toBeNull();
    expect(screen.queryByText('RECENT SHOWS')).toBeNull();
  });

  it('shows only the basics and lock state for a restricted profile', () => {
    useAuthStore.setState({ user: { id: 'visitor' } as never });
    setOverview({
      ...baseProfile,
      restricted: true,
      profile: { ...baseProfile.profile, is_private: true },
    });
    render(<ProfileScreen />, { wrapper });
    expect(screen.getByText('Live Fan')).toBeTruthy();
    expect(screen.getByText('This profile is private')).toBeTruthy();
    expect(screen.queryByText('WHAT I’M INTO RECENTLY')).toBeNull();
  });

  it('shows a follow action on a visitor profile without showing owner settings', () => {
    useAuthStore.setState({ user: { id: 'visitor-id' } as never });
    setOverview({
      ...baseProfile,
      profile: { ...baseProfile.profile, is_private: true },
      restricted: true,
    });
    render(<ProfileScreen />, { wrapper });

    expect(screen.getByText('Request to follow')).toBeTruthy();
    expect(screen.queryByLabelText('Profile settings')).toBeNull();
    fireEvent.press(screen.getByText('Request to follow'));
    expect(mockFollowMutate).toHaveBeenCalledWith(
      { followeeId: 'profile-owner' },
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('resolves the stable own-profile route after the username loads', () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ username: 'me' } as never);
    setOverview(baseProfile);

    render(<ProfileScreen />, { wrapper });

    expect(screen.getByText('WHAT I’M INTO RECENTLY')).toBeTruthy();
  });

  it('switches to the requested Timeline and Friends sections', () => {
    setOverview(baseProfile);
    const view = render(<ProfileScreen />, { wrapper });

    fireEvent.press(screen.getByText('Timeline'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'timeline' });
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ tab: 'timeline' } as never);
    view.rerender(<ProfileScreen />);
    expect(screen.getByText('Timeline section content')).toBeTruthy();

    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ tab: 'profile' } as never);
    view.rerender(<ProfileScreen />);
    fireEvent.press(screen.getAllByText('Friends')[0]!);
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'friends' });
    jest.mocked(useLocalSearchParams).mockReturnValue({
      tab: 'friends',
      friendsTab: 'following',
    } as never);
    view.rerender(<ProfileScreen />);
    expect(
      screen.getByText('Friends section content (following)'),
    ).toBeTruthy();
  });

  it('opens the Friends subsection selected by a profile count deep link', () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ tab: 'friends', friendsTab: 'followers' } as never);
    setOverview(baseProfile);

    render(<ProfileScreen />, { wrapper });

    expect(
      screen.getByText('Friends section content (followers)'),
    ).toBeTruthy();
  });
});

describe('wishlist card dates', () => {
  const item: WishlistItem = baseProfile.wishlist!.items[0]!;

  it('shows Date TBD when target_date is null', () => {
    render(
      <WishlistCard
        item={item}
        isOwner={false}
        onGoing={jest.fn()}
        onWent={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/Date TBD/)).toBeTruthy();
  });

  it('renders a target date when present', () => {
    render(
      <WishlistCard
        item={{ ...item, target_date: '2027-06-03', date_flexible: false }}
        isOwner={false}
        onGoing={jest.fn()}
        onWent={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText(/2027/)).toBeTruthy();
  });
});
