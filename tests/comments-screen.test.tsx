import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommentsScreen } from '../src/components/social/CommentsScreen';
import { ThemeProvider } from '../src/theme/ThemeProvider';

const mockPostComment = jest.fn();
const mockRefetch = jest.fn();

jest.mock('../src/features/social/hooks', () => ({
  useComments: () => ({
    data: [
      {
        id: 'comment-1',
        log_id: 'log-1',
        user_id: 'user-2',
        body: 'Amazing show!',
        created_at: '2026-11-10T12:00:00Z',
        author: {
          id: 'user-2',
          username: 'listener',
          display_name: 'Listener',
          avatar_url: null,
        },
      },
    ],
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
  }),
  usePostComment: () => ({
    mutate: mockPostComment,
    isPending: false,
  }),
  useDeleteComment: () => ({ mutate: jest.fn(), isPending: false }),
  useSubmitReport: () => ({ mutate: jest.fn(), isPending: false }),
}));

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CommentsScreen logId="log-1" onBack={jest.fn()} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('CommentsScreen', () => {
  it('shows comments for the selected log and submits a comment', () => {
    renderScreen();

    expect(screen.getByText('Amazing show!')).toBeTruthy();
    expect(screen.getByText('Comments · 1')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Add a comment'), 'So good!');
    fireEvent.press(screen.getByLabelText('Send comment'));

    expect(mockPostComment).toHaveBeenCalledWith(
      'So good!',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
