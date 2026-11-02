import { describe, expect, it } from '@jest/globals';
import { playCloudSound } from '../src/features/cloud/sounds';

describe('Cloud sound registry', () => {
  it('does nothing when sounds are disabled', async () => {
    await expect(playCloudSound('stamp', false, false)).resolves.toBeUndefined();
  });

  it('does nothing when Reduce Motion is enabled', async () => {
    await expect(playCloudSound('stamp', true, true)).resolves.toBeUndefined();
  });

  it('does nothing when the requested asset is missing', async () => {
    await expect(playCloudSound('stamp', true, false)).resolves.toBeUndefined();
  });
});
