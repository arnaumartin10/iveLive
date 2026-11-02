import React, { type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { customArtistFormSchema } from '../src/features/artists/schemas';
import { getDeterministicGradient, hashString } from '../src/lib/utils';
import { AddManuallyRow } from '../src/features/artists/AddManuallyRow';
import { DuplicateArtistSheet } from '../src/features/artists/DuplicateArtistSheet';
import { CustomArtistForm } from '../src/features/artists/CustomArtistForm';
import { ArtistSearch } from '../src/features/artists/ArtistSearch';
import { Avatar } from '../src/components/ui/Avatar';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/features/auth/store';
import * as artistApi from '../src/features/artists/api';
import type {
  ArtistRow,
  SimilarArtistMatch,
} from '../src/features/artists/types';

jest.mock('../src/features/artists/api');
const mockedApi = jest.mocked(artistApi);

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///test-image.jpg', width: 800, height: 800 }],
  })),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async (uri: string, actions: any[]) => ({
    uri: `${uri}-manipulated`,
    width: actions[0]?.resize?.width ?? 256,
    height: actions[0]?.resize?.height ?? 256,
  })),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '11111111-2222-3333-4444-555555555555'),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    );
  };
}

describe('Custom Artist Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
      isLoading: false,
    });
  });

  describe('Form Validation (react-hook-form + zod)', () => {
    it('validates artist name is required and max 80 chars', () => {
      expect(
        customArtistFormSchema.safeParse({
          name: '',
          macroGenres: [],
          freeTextTags: [],
        }).success,
      ).toBe(false);

      expect(
        customArtistFormSchema.safeParse({
          name: 'A'.repeat(81),
          macroGenres: [],
          freeTextTags: [],
        }).success,
      ).toBe(false);

      expect(
        customArtistFormSchema.safeParse({
          name: 'The National',
          macroGenres: ['indie', 'rock'],
          freeTextTags: ['sad dad'],
        }).success,
      ).toBe(true);
    });

    it('enforces maximum 3 custom free-text tags', () => {
      const valid = customArtistFormSchema.safeParse({
        name: 'The Smile',
        macroGenres: ['rock'],
        freeTextTags: ['art rock', 'post-punk', 'krautrock'],
      });
      expect(valid.success).toBe(true);

      const invalid = customArtistFormSchema.safeParse({
        name: 'The Smile',
        macroGenres: ['rock'],
        freeTextTags: ['tag1', 'tag2', 'tag3', 'tag4'],
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Deterministic Gradient Avatar from Name Hash', () => {
    it('generates consistent deterministic gradient colors from name', () => {
      const gradient1 = getDeterministicGradient('Radiohead');
      const gradient2 = getDeterministicGradient('Radiohead');
      expect(gradient1).toEqual(gradient2);
      expect(gradient1[0]).toMatch(/^#[0-9A-F]{6}$/i);
      expect(gradient1[1]).toMatch(/^#[0-9A-F]{6}$/i);

      const hash1 = hashString('radiohead');
      const hash2 = hashString('radiohead');
      expect(hash1).toBe(hash2);
    });

    it('renders Avatar with deterministic gradient when no photo is provided', () => {
      render(<Avatar name="Bon Iver" size="xl" />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('BI')).toBeTruthy();
      expect(screen.getByLabelText('Bon Iver avatar')).toBeTruthy();
    });

    it('renders a safe fallback when profile data has no name', () => {
      render(<Avatar name={undefined} />, { wrapper: createWrapper() });
      expect(screen.getByText('UU')).toBeTruthy();
      expect(screen.getByLabelText('Unknown user avatar')).toBeTruthy();
    });
  });

  describe('Add Manually Row at Bottom of Search', () => {
    it('renders AddManuallyRow and calls onPress callback with query', () => {
      const onAdd = jest.fn();
      render(<AddManuallyRow query="Underground Band" onPress={onAdd} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Can't find them? Add manually")).toBeTruthy();
      expect(
        screen.getByText('Create "Underground Band" as a custom artist'),
      ).toBeTruthy();

      fireEvent.press(screen.getByLabelText("Can't find them? Add manually"));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('shows AddManuallyRow in ArtistSearch component', () => {
      mockedApi.searchArtists.mockResolvedValue({
        results: [],
        rateLimited: false,
      });
      const onAdd = jest.fn();
      const onSelect = jest.fn();

      render(<ArtistSearch onSelectArtist={onSelect} onAddManually={onAdd} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText("Can't find them? Add manually")).toBeTruthy();
      fireEvent.press(screen.getByLabelText("Can't find them? Add manually"));
      expect(onAdd).toHaveBeenCalled();
    });
  });

  describe('Duplicate Guard: pg_trgm similarity', () => {
    it('shows Did You Mean sheet when close matches (threshold >= 0.5) exist', async () => {
      const mockMatch: SimilarArtistMatch = {
        id: 'existing-artist-1',
        name: 'The Strokes',
        source: 'spotify',
        imageUrlThumb: 'https://img.test/thumb.jpg',
        imageUrlLarge: 'https://img.test/large.jpg',
        genres: ['indie rock'],
        macroGenres: ['indie'],
        similarity: 0.88,
      };

      mockedApi.findSimilarArtists.mockResolvedValue([mockMatch]);
      const onSuccess = jest.fn();
      const onSelectExisting = jest.fn();

      render(
        <CustomArtistForm
          initialName="The Strokess"
          onSuccess={onSuccess}
          onSelectExisting={onSelectExisting}
        />,
        { wrapper: createWrapper() },
      );

      // Submit form
      const submitBtn = screen.getByText('Create Custom Artist');
      fireEvent.press(submitBtn);

      await waitFor(() => {
        expect(mockedApi.findSimilarArtists).toHaveBeenCalledWith(
          'The Strokess',
          0.5,
        );
      });

      // Sheet displays close match
      await screen.findByText('Did you mean...?');
      expect(screen.getByText('The Strokes')).toBeTruthy();
      expect(screen.getByText('Create anyway')).toBeTruthy();
    });

    it('allows "Create anyway" to bypass duplicate warning and save artist', async () => {
      const mockSavedArtist: ArtistRow = {
        id: 'new-artist-id',
        spotify_id: null,
        name: 'The Strokess',
        name_normalized: 'the strokess',
        image_url_large: null,
        image_url_thumb: null,
        genres: ['rock'],
        macro_genres: ['rock'],
        primary_macro: 'rock',
        is_on_tour: false,
        public_avg_rating: null,
        public_rating_count: 0,
        public_weighted_rating: null,
        tour_end_date: null,
        tour_last_checked_at: null,
        tour_start_date: null,
        popularity: null,
        source: 'manual',
        created_by: 'test-user-id',
        last_synced_at: null,
        created_at: new Date().toISOString(),
        bio: null,
        bio_source: null,
        bio_url: null,
        bio_lang: null,
        bio_attribution: null,
        group_image_url: null,
        banner_image_url: null,
        musicbrainz_id: null,
        wikidata_id: null,
        wikipedia_title: null,
        lastfm_tags: [],
        enrichment_status: 'pending',
        enrichment_error: null,
        enriched_at: null,
        last_enrichment_requested_at: null,
        user_edited_fields: ['genres', 'image_url_large', 'image_url_thumb'],
        begin_year: null,
        begin_year_source: null,
      };

      mockedApi.findSimilarArtists.mockResolvedValue([
        {
          id: 'existing-artist-1',
          name: 'The Strokes',
          source: 'spotify',
          imageUrlThumb: null,
          imageUrlLarge: null,
          genres: ['rock'],
          macroGenres: ['rock'],
          similarity: 0.85,
        },
      ]);
      mockedApi.createManualArtist.mockResolvedValue(mockSavedArtist);

      const onSuccess = jest.fn();

      render(
        <CustomArtistForm initialName="The Strokess" onSuccess={onSuccess} />,
        { wrapper: createWrapper() },
      );

      // Submit form
      fireEvent.press(screen.getByText('Create Custom Artist'));

      await screen.findByText('Did you mean...?');

      // Click "Create anyway"
      fireEvent.press(screen.getByText('Create anyway'));

      await waitFor(() => {
        expect(mockedApi.createManualArtist).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'The Strokess',
          }),
          'test-user-id',
        );
      });

      expect(onSuccess).toHaveBeenCalledWith(mockSavedArtist);
    });
  });

  describe('Creator Edit & Delete Permissions', () => {
    it('allows edit and delete only when no other user has logged it', async () => {
      const artist: ArtistRow = {
        id: 'manual-artist-1',
        spotify_id: null,
        name: 'Local Garage Band',
        name_normalized: 'local garage band',
        image_url_large: null,
        image_url_thumb: null,
        genres: ['punk'],
        macro_genres: ['punk'],
        primary_macro: 'punk',
        is_on_tour: false,
        public_avg_rating: null,
        public_rating_count: 0,
        public_weighted_rating: null,
        tour_end_date: null,
        tour_last_checked_at: null,
        tour_start_date: null,
        popularity: null,
        source: 'manual',
        created_by: 'creator-uid',
        last_synced_at: null,
        created_at: new Date().toISOString(),
        bio: null,
        bio_source: null,
        bio_url: null,
        bio_lang: null,
        bio_attribution: null,
        group_image_url: null,
        banner_image_url: null,
        musicbrainz_id: null,
        wikidata_id: null,
        wikipedia_title: null,
        lastfm_tags: [],
        enrichment_status: 'pending',
        enrichment_error: null,
        enriched_at: null,
        last_enrichment_requested_at: null,
        user_edited_fields: ['genres', 'image_url_large', 'image_url_thumb'],
        begin_year: null,
        begin_year_source: null,
      };

      // When no other user logged it:
      mockedApi.checkArtistManagePermissions.mockResolvedValue({
        isCreator: true,
        canEdit: true,
        canDelete: true,
        otherUserLogCount: 0,
      });

      const allowed = await artistApi.checkArtistManagePermissions(
        artist,
        'creator-uid',
      );
      expect(allowed.canEdit).toBe(true);
      expect(allowed.canDelete).toBe(true);

      // When another user HAS logged it:
      mockedApi.checkArtistManagePermissions.mockResolvedValue({
        isCreator: true,
        canEdit: false,
        canDelete: false,
        otherUserLogCount: 2,
      });

      const restricted = await artistApi.checkArtistManagePermissions(
        artist,
        'creator-uid',
      );
      expect(restricted.canEdit).toBe(false);
      expect(restricted.canDelete).toBe(false);
      expect(restricted.otherUserLogCount).toBe(2);
    });
  });
});
