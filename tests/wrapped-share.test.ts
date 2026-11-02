import { describe, expect, it } from '@jest/globals';
import { WRAPPED_SHARE_SIZES } from '../src/features/wrapped/shareDimensions';

describe('Wrapped share image dimensions', () => {
  it('exports story and summary canvases at their required pixel sizes', () => {
    expect(WRAPPED_SHARE_SIZES.story).toEqual({ width: 1080, height: 1920 });
    expect(WRAPPED_SHARE_SIZES.summary).toEqual({ width: 1080, height: 1350 });
  });
});
