import { Alert } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { router } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ensureArtist } from './api';
import type { ArtistRow, ArtistSearchResult } from './types';

export type ArtistSeedInput = {
  artistId?: string;
  existingArtistId?: string;
  spotifyId?: string | null;
  name?: string;
  imageUrl?: string | null;
  imageLarge?: string | null;
  imageThumb?: string | null;
  genres?: string[];
  macroGenres?: string[];
  artist?: ArtistRow;
  source?: 'spotify' | 'manual';
};

export type ArtistCardInput = string | ArtistSearchResult | ArtistSeedInput;

type ArtistCardContextValue = {
  openArtistCard: (artist: ArtistCardInput) => Promise<void>;
};

const ArtistCardContext = createContext<ArtistCardContextValue | null>(null);

export function ArtistCardProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();

  const openArtistCard = useCallback(
    async (input: ArtistCardInput) => {
      try {
        if (typeof input === 'string') {
          const cached = queryClient.getQueryData<{
            image_url_large?: string | null;
            image_url_thumb?: string | null;
          }>(['artist', input]);
          const imageUrl = cached?.image_url_large ?? cached?.image_url_thumb;
          if (imageUrl)
            void Image.prefetch(imageUrl, { cachePolicy: 'memory-disk' });
          router.navigate(routes.artist(input));
          return;
        }

        const existingId =
          input.artist?.id ?? input.artistId ?? input.existingArtistId;
        if (existingId) {
          const imageUrl =
            input.artist?.banner_image_url ??
            input.artist?.group_image_url ??
            input.artist?.image_url_large ??
            input.artist?.image_url_thumb ??
            input.imageLarge ??
            ('imageUrl' in input ? input.imageUrl : null) ??
            null;
          if (imageUrl)
            void Image.prefetch(imageUrl, { cachePolicy: 'memory-disk' });
          router.navigate(routes.artist(existingId));
          return;
        }

        const artist = await ensureArtist(input as ArtistSearchResult);
        const imageUrl =
          artist.banner_image_url ??
          artist.group_image_url ??
          artist.image_url_large ??
          artist.image_url_thumb;
        if (imageUrl)
          void Image.prefetch(imageUrl, { cachePolicy: 'memory-disk' });
        router.navigate(routes.artist(artist.id));
      } catch (error) {
        Alert.alert(
          'Could not open artist',
          error instanceof Error ? error.message : 'Try again later.',
        );
      }
    },
    [queryClient],
  );

  const value = useMemo(() => ({ openArtistCard }), [openArtistCard]);

  return (
    <ArtistCardContext.Provider value={value}>
      {children}
    </ArtistCardContext.Provider>
  );
}

export function useArtistCard() {
  const context = useContext(ArtistCardContext);
  if (!context)
    throw new Error('useArtistCard must be used within ArtistCardProvider');
  return context;
}

export function useOptionalArtistCard() {
  return useContext(ArtistCardContext);
}
