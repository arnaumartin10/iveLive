export type KeepsakeFrameLayout =
  | 'edit_row'
  | 'hidden'
  | 'single'
  | 'pair'
  | 'hero_stack';

export function getKeepsakeFrameLayout(
  count: number,
  mode: 'edit' | 'view',
): KeepsakeFrameLayout {
  if (mode === 'edit') return 'edit_row';
  if (count <= 0) return 'hidden';
  if (count === 1) return 'single';
  if (count === 2) return 'pair';
  return 'hero_stack';
}
