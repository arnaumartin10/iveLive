import { useQuery } from '@tanstack/react-query';
import { fetchGenrePage } from './content';

export const genrePageKeys = {
  page: (slug: string) => ['genre-page', slug] as const,
};

export function useGenrePage(slug: string, enabled = true) {
  return useQuery({
    queryKey: genrePageKeys.page(slug),
    queryFn: () => fetchGenrePage(slug),
    enabled: enabled && slug.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
