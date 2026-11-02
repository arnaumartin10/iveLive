export function isAccessibleListRequired(
  platform: string,
  screenReaderEnabled: boolean,
  listViewEnabled: boolean,
): boolean {
  return listViewEnabled || (platform !== 'web' && screenReaderEnabled);
}
