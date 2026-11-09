import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import ArchiveRedirect from '../src/app/archive';
import FriendsRedirect from '../src/app/friends';
import TimelineRedirect from '../src/app/timeline';
import UserFriendsRedirect from '../src/app/user/friends';
import UserDiaryRedirect from '../src/app/user/[username]/diary';
import UserNestedFriendsRedirect from '../src/app/user/[username]/friends';
import UserWishlistRedirect from '../src/app/user/[username]/wishlist';

const mockUseLocalSearchParams = jest.fn<() => Record<string, string>>(
  () => ({}),
);

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>(
      'react-native',
    );
    return (
      <Text testID="redirect">
        {typeof href === 'string' ? href : JSON.stringify(href)}
      </Text>
    );
  },
  useLocalSearchParams: () => mockUseLocalSearchParams() as never,
}));

function expectRedirect(expected: string) {
  expect(screen.getByTestId('redirect').props.children).toBe(expected);
}

describe('legacy route redirects', () => {
  it('keeps timeline and archive aliases pointed at the profile timeline', () => {
    const timeline = render(<TimelineRedirect />);
    expectRedirect(
      '{"pathname":"/(tabs)/profile","params":{"tab":"timeline"}}',
    );
    timeline.unmount();
    render(<ArchiveRedirect />);
    expectRedirect(
      '{"pathname":"/(tabs)/profile","params":{"tab":"timeline"}}',
    );
  });

  it('keeps friends aliases pointed at the profile friends tab', () => {
    const friends = render(<FriendsRedirect />);
    expectRedirect('{"pathname":"/(tabs)/profile","params":{"tab":"friends"}}');
    friends.unmount();
    render(<UserFriendsRedirect />);
    expectRedirect('{"pathname":"/(tabs)/profile","params":{"tab":"friends"}}');
  });

  it('preserves the diary identity and filters when redirecting', () => {
    mockUseLocalSearchParams.mockReturnValueOnce({
      username: 'listener',
      year: '2025',
    });
    render(<UserDiaryRedirect />);
    expectRedirect(
      '{"pathname":"/user/[username]","params":{"username":"listener","year":"2025","tab":"timeline"}}',
    );
  });

  it.each([
    [UserNestedFriendsRedirect, 'friends'],
    [UserWishlistRedirect, 'wishlist'],
  ])('keeps the nested %s alias on the corresponding user tab', (Route, tab) => {
    mockUseLocalSearchParams.mockReturnValueOnce({ username: 'listener' });
    render(<Route />);
    expectRedirect(
      `{"pathname":"/user/[username]","params":{"username":"listener","tab":"${tab}"}}`,
    );
  });
});
