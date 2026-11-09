import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'compact' | 'regular' | 'wide';

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  if (width < 400) return 'compact';
  if (width < 768) return 'regular';
  return 'wide';
}
