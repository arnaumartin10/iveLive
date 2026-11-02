import { describe, expect, it } from '@jest/globals';
import {
  calculatePosterLayout,
  getPosterDimensions,
  getPosterRenderPlan,
} from '../src/features/cloud/poster';

describe('Atlas poster layout', () => {
  it('matches the story-format layout snapshot', () => {
    expect(calculatePosterLayout(1080, 1920)).toMatchInlineSnapshot(`
      {
        "cartouche": {
          "height": 202,
          "width": 940,
          "x": 70,
          "y": 106,
        },
        "height": 1920,
        "legend": {
          "height": 230,
          "width": 940,
          "x": 70,
          "y": 1392,
        },
        "map": {
          "height": 998,
          "width": 940,
          "x": 70,
          "y": 346,
        },
        "margin": 70,
        "stats": {
          "height": 144,
          "width": 940,
          "x": 70,
          "y": 1680,
        },
        "subtitleSize": 14,
        "titleSize": 50,
        "width": 1080,
      }
    `);
  });

  it('uses the requested exact export dimensions', () => {
    expect(getPosterDimensions('print')).toEqual({
      width: 3000,
      height: 4200,
    });
    expect(getPosterDimensions('story')).toEqual({
      width: 1080,
      height: 1920,
    });
  });

  it('uses the 2000px memory-safe print plan on low-memory devices', () => {
    expect(
      getPosterRenderPlan('print', 3 * 1024 * 1024 * 1024),
    ).toEqual({
      dimensions: { width: 2000, height: 2800 },
      fellBack: true,
    });
    expect(
      getPosterRenderPlan('print', 8 * 1024 * 1024 * 1024),
    ).toEqual({
      dimensions: { width: 3000, height: 4200 },
      fellBack: false,
    });
  });
});
