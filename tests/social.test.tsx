import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { FeedCard } from '../src/components/social/FeedCard';
import type { FeedItem } from '../src/features/social/types';
import type { FeedMedia } from '../src/features/media/types';
import * as socialApi from '../src/features/social/api';
import { supabase } from '../src/lib/supabase';

// Mock supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
  },
}));

const mockFeedItem: FeedItem = {
  id: 'log-1',
  user_id: 'user-1',
  artist_id: 'artist-1',
  event_date: '2026-05-15',
  venue_type: 'indoor_arena',
  venue_name: 'Madison Square Garden',
  rating: 4.5,
  review: 'Unbelievable performance and stage production!',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  artist: {
    id: 'artist-1',
    name: 'Radiohead',
    image_url_large: 'https://example.com/radiohead.jpg',
    image_url_thumb: null,
    primary_macro: 'rock',
    macro_genres: ['rock', 'alternative'],
  },
  author: {
    id: 'user-1',
    username: 'thom_fan',
    display_name: 'Thom Fan',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  like_count: 12,
  comment_count: 3,
  liked_by_me: false,
  media: [],
  media_count: 0,
  setlist: null,
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('Social API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searchProfiles calls search_profiles RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({
      data: [
        {
          id: 'u1',
          username: 'alex',
          follower_count: 5,
          is_following: false,
          follow_status: null,
        },
      ],
      error: null,
    });

    const res = await socialApi.searchProfiles('alex');
    expect(supabase.rpc).toHaveBeenCalledWith('search_profiles', {
      p_query: 'alex',
      p_limit: 20,
    });
    expect(res).toHaveLength(1);
    expect(res[0]!.username).toBe('alex');
  });

  it('sendFollowRequest calls send_follow_request RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({
      data: 'accepted',
      error: null,
    });

    const res = await socialApi.sendFollowRequest('u2');
    expect(supabase.rpc).toHaveBeenCalledWith('send_follow_request', {
      p_followee: 'u2',
    });
    expect(res).toBe('accepted');
  });

  it('unfollowUser calls unfollow_user RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ error: null });
    await socialApi.unfollowUser('u2');
    expect(supabase.rpc).toHaveBeenCalledWith('unfollow_user', {
      p_followee: 'u2',
    });
  });

  it('acceptFollowRequest calls accept_follow_request RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ error: null });
    await socialApi.acceptFollowRequest('u3');
    expect(supabase.rpc).toHaveBeenCalledWith('accept_follow_request', {
      p_follower: 'u3',
    });
  });

  it('declineFollowRequest calls decline_follow_request RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ error: null });
    await socialApi.declineFollowRequest('u3');
    expect(supabase.rpc).toHaveBeenCalledWith('decline_follow_request', {
      p_follower: 'u3',
    });
  });

  it('blockUser calls block_user RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ error: null });
    await socialApi.blockUser('u-bad');
    expect(supabase.rpc).toHaveBeenCalledWith('block_user', {
      p_blocked: 'u-bad',
    });
  });

  it('submitReport calls submit_report RPC', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ error: null });
    await socialApi.submitReport({
      reportedUser: 'u-bad',
      reportedLog: 'log-1',
      reason: 'spam',
    });
    expect(supabase.rpc).toHaveBeenCalledWith('submit_report', {
      p_reported_user: 'u-bad',
      p_reported_log: 'log-1',
      p_reason: 'spam',
      p_details: null,
    });
  });
});

describe('FeedCard', () => {
  const media: FeedMedia[] = [
    {
      slot: 'concert_photo',
      kind: 'image',
      thumb_path: 'user/log/show-thumb.jpg',
      poster_path: null,
      storage_path: 'user/log/show.jpg',
      width: 1600,
      height: 1200,
      duration_ms: null,
      caption: null,
      thumb_url: 'https://example.com/show-thumb.jpg',
      poster_url: null,
    },
    {
      slot: 'companions_photo',
      kind: 'image',
      thumb_path: 'user/log/crew-thumb.jpg',
      poster_path: null,
      storage_path: 'user/log/crew.jpg',
      width: 1600,
      height: 1200,
      duration_ms: null,
      caption: null,
      thumb_url: 'https://example.com/crew-thumb.jpg',
      poster_url: null,
    },
    {
      slot: 'concert_video',
      kind: 'video',
      thumb_path: 'user/log/reel-thumb.jpg',
      poster_path: 'user/log/reel-poster.jpg',
      storage_path: 'user/log/reel.mp4',
      width: 480,
      height: 270,
      duration_ms: 17_000,
      caption: null,
      thumb_url: 'https://example.com/reel-thumb.jpg',
      poster_url: 'https://example.com/reel-poster.jpg',
    },
  ];

  it('renders author, artist name, venue, review and metadata', () => {
    const handleOpenComments = jest.fn();
    const handlePressArtist = jest.fn();

    renderWithClient(
      <FeedCard
        item={mockFeedItem}
        onOpenComments={handleOpenComments}
        onPressArtist={handlePressArtist}
      />,
    );

    expect(screen.getByText('Thom Fan')).toBeTruthy();
    expect(screen.getByText(' @thom_fan')).toBeTruthy();
    expect(screen.getByText('Radiohead')).toBeTruthy();
    expect(screen.getByText('Madison Square Garden')).toBeTruthy();
    expect(
      screen.getByText('Unbelievable performance and stage production!'),
    ).toBeTruthy();
    expect(screen.getByText('SHOW NOTE')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy(); // like count
    expect(screen.getByText('3')).toBeTruthy(); // comment count
  });

  it('renders a saved setlist only when the log has songs', () => {
    renderWithClient(
      <FeedCard
        item={{
          ...mockFeedItem,
          setlist: {
            source: 'setlistfm',
            source_url: 'https://www.setlist.fm/setlist/example.html',
            artist: 'Radiohead',
            venue: 'Madison Square Garden',
            city: 'New York',
            event_date: '2026-05-15',
            event_year: 2026,
            songs: [
              {
                title: 'Everything in Its Right Place',
                setName: 'Main Set',
                encore: false,
                medal: 'gold',
              },
            ],
          },
        }}
        onOpenComments={jest.fn()}
      />,
    );

    expect(screen.getByText('SETLIST · 1 SONGS')).toBeTruthy();
    expect(screen.getByText('Everything in Its Right Place')).toBeTruthy();
    expect(screen.getByText('Setlist via setlist.fm')).toBeTruthy();
  });

  it('does not render a setlist section when none is saved', () => {
    renderWithClient(
      <FeedCard item={mockFeedItem} onOpenComments={jest.fn()} />,
    );
    expect(screen.queryByText(/SETLIST ·/)).toBeNull();
  });

  it('calls onOpenComments when comment button is tapped', () => {
    const handleOpenComments = jest.fn();

    renderWithClient(
      <FeedCard item={mockFeedItem} onOpenComments={handleOpenComments} />,
    );

    const commentBtn = screen.getByLabelText('Open comments. 3 comments.');
    fireEvent.press(commentBtn);
    expect(handleOpenComments).toHaveBeenCalledWith(mockFeedItem);
  });

  it('opens the author profile when the feed author is tapped', () => {
    const handlePressUser = jest.fn();

    renderWithClient(
      <FeedCard
        item={mockFeedItem}
        onOpenComments={jest.fn()}
        onPressUser={handlePressUser}
      />,
    );

    fireEvent.press(screen.getByLabelText('Open @thom_fan'));
    expect(handlePressUser).toHaveBeenCalledWith('thom_fan');
  });

  it('uses a wide frame and the banner source for artist activity photos', () => {
    renderWithClient(
      <FeedCard
        item={{
          ...mockFeedItem,
          artist: {
            ...mockFeedItem.artist,
            group_image_url: 'https://example.com/group.jpg',
            banner_image_url: 'https://example.com/banner.jpg',
          },
        }}
        onOpenComments={jest.fn()}
      />,
    );

    const photoStyle = screen.getByTestId('feed-artist-photo').props.style;
    expect(photoStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aspectRatio: 16 / 9 }),
      ]),
    );
    expect(screen.getByTestId('feed-artist-image').props.source).toEqual(
      expect.arrayContaining([{ uri: 'https://example.com/banner.jpg' }]),
    );
  });

  it.each([1, 2, 3])(
    'shows a hero and up to two extra keepsakes for %i media items',
    (count) => {
      renderWithClient(
        <FeedCard
          item={{
            ...mockFeedItem,
            media: media.slice(0, count),
            media_count: count,
          }}
          onOpenComments={jest.fn()}
        />,
      );

      expect(screen.getByTestId('feed-keepsake-hero')).toBeTruthy();
      expect(
        screen.queryByLabelText('View companions photo keepsake') !== null,
      ).toBe(count > 1);
      expect(
        screen.queryByLabelText('View concert video keepsake') !== null,
      ).toBe(count > 2);
      if (count === 3) expect(screen.getByText('17s')).toBeTruthy();
    },
  );
});
