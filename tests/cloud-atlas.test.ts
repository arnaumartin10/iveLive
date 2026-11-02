import { describe, expect, it } from '@jest/globals';
import {
  buildAtlasTerritories,
  buildTerritoryOutline,
} from '../src/features/cloud/atlas';

describe('Cloud Atlas geometry', () => {
  it('creates stable, non-degenerate hand-authored territory contours', () => {
    const first = buildTerritoryOutline('rock', 100);
    const second = buildTerritoryOutline('rock', 100);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThanOrEqual(10);
    expect(
      first.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)),
    ).toBe(true);
    expect(new Set(first.map(({ x, y }) => `${x}:${y}`)).size).toBe(
      first.length,
    );
  });

  it('scales outlines without changing their deterministic shape', () => {
    const small = buildTerritoryOutline('indie', 60);
    const large = buildTerritoryOutline('indie', 120);

    expect(large[0]!.x / small[0]!.x).toBeCloseTo(2, 1);
    expect(large[0]!.y / small[0]!.y).toBeCloseTo(2, 1);
  });

  it('builds all fourteen printed territories and keeps empty worlds visible', () => {
    const territories = buildAtlasTerritories([
      { slug: 'rock', label: 'Rock', x: -40, y: 20, radius: 48, count: 3 },
      {
        slug: 'unclassified',
        label: 'Unclassified',
        x: 0,
        y: 0,
        radius: 40,
        count: 1,
      },
      { slug: 'indie', label: 'Indie', x: 0, y: 0, radius: 40, count: 0 },
    ]);

    expect(territories).toHaveLength(14);
    expect(territories.find(({ slug }) => slug === 'rock')).toMatchObject({
      slug: 'rock',
      pattern: 'dots',
      x: -40,
      y: 20,
      count: 3,
    });
    expect(territories.find(({ slug }) => slug === 'indie')).toMatchObject({
      slug: 'indie',
      count: 0,
    });
    expect(territories.some(({ slug }) => slug === 'unclassified')).toBe(false);
  });
});
