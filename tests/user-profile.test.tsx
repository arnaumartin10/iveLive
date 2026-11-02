import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import UserProfileScreen from '../src/app/user/[username]';

jest.mock('../src/components/profile/ProfileScreen', () => ({
  ProfileScreen: () =>
    require('react').createElement(
      require('react-native').Text,
      null,
      'Shared Letterboxd profile',
    ),
}));

jest.mock('../src/features/auth/hooks', () => ({
  useMe: () => ({ data: { username: 'viewer' } }),
}));

describe('user profile route', () => {
  it('uses the shared profile screen for owners and visitors', () => {
    render(<UserProfileScreen />);
    expect(screen.getByText('Shared Letterboxd profile')).toBeTruthy();
  });
});
