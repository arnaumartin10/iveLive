import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useLogDraft } from '../src/features/log/store';
import type { VenueSearchResult } from '../src/features/venues/types';
import { useVenueSearch } from '../src/features/venues/hooks';
import StepVenueDetails from '../src/app/log/step-venue-details';

jest.mock('../src/features/concerts/hooks', () => ({
  useVenueNameSuggestions: () => ({ data: [] }),
}));

jest.mock('../src/features/venues/hooks', () => ({
  useVenueSearch: jest.fn(),
}));

const results: VenueSearchResult[] = [
  {
    id: 'venue-1',
    name: 'Razzmatazz',
    venueType: 'concert_hall_club',
    city: 'Barcelona',
    country: 'ES',
    externalId: 'mbid-1',
  },
];

const mockUseVenueSearch = jest.mocked(useVenueSearch);

function renderStep() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 812 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      <ThemeProvider>
        <StepVenueDetails />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('venue autocomplete', () => {
  beforeEach(() => {
    useLogDraft.getState().reset();
    useLogDraft.getState().setVenueType('concert_hall_club');
    mockUseVenueSearch.mockReturnValue({
      data: { results, externalDeferred: false },
      isFetching: false,
      isError: false,
    } as ReturnType<typeof useVenueSearch>);
  });

  it('selects a canonical venue and stores both its ID and name', () => {
    renderStep();
    fireEvent.changeText(
      screen.getByLabelText('Venue or event name'),
      'Razzmatazz',
    );
    fireEvent.press(
      screen.getByRole('button', { name: 'Select Razzmatazz, Barcelona, ES' }),
    );

    expect(useLogDraft.getState().venueId).toBe('venue-1');
    expect(useLogDraft.getState().venueName).toBe('Razzmatazz');
  });

  it('keeps a custom name and clears a previous canonical venue when edited', () => {
    useLogDraft.getState().setVenueSelection(results[0]!);
    renderStep();
    fireEvent.changeText(
      screen.getByLabelText('Venue or event name'),
      'My local venue',
    );

    expect(useLogDraft.getState().venueName).toBe('My local venue');
    expect(useLogDraft.getState().venueId).toBeNull();
  });

  it('does not show an empty-results message when the endpoint itself fails', () => {
    mockUseVenueSearch.mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: true,
    } as ReturnType<typeof useVenueSearch>);
    useLogDraft.getState().setVenueName('Razzmatazz');
    renderStep();

    expect(
      screen.getByText(
        'Venue search is not set up yet or is temporarily unavailable. You can still use a custom name.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('No matching venues yet.')).toBeNull();
  });
});
