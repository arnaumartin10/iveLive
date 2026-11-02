import { Mascot as BrandMascot } from '../brand/Mascot';
import type { MascotMood, MascotVariant, MascotProps } from '../brand/Mascot';

export type { MascotMood, MascotVariant };

type LegacyMascotProps = Omit<MascotProps, 'size'> & { size?: number };

export function Mascot({ size = 220, ...props }: LegacyMascotProps) {
  return <BrandMascot size={size} {...props} />;
}
