import { Wordmark as BrandWordmark } from '../brand/Wordmark';
import type { WordmarkVariant } from '../brand/Wordmark';
import type { ImageStyle, StyleProp } from 'react-native';

export type { WordmarkVariant };

export function Wordmark({
  height = 48,
  variant = 'ink',
  accessibilityLabel = 'IveLive',
  style,
}: {
  height?: number;
  variant?: WordmarkVariant;
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <BrandWordmark
      accessibilityLabel={accessibilityLabel}
      height={height}
      style={style}
      variant={variant}
    />
  );
}
