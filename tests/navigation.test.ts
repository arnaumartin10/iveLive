import { describe, expect, it } from '@jest/globals';
import type { Href } from 'expo-router';
import { getLogFallback, routes } from '../src/navigation/routes';
import { getSafeBackDecision } from '../src/navigation/useSafeBack';
import { validateReturnTo } from '../src/navigation/returnTo';
import { getPageTitle } from '../src/navigation/pageTitles';

const routeFallbacks: [string, Href][] = [
  ['artist', routes.fallback.artist()],
  ['genre', routes.fallback.genre()],
  ['genre browse', routes.fallback.genres()],
  ['log detail', routes.fallback.log()],
  ['user profile', routes.fallback.user()],
  ['log wizard', routes.fallback.wizard()],
  ['settings', routes.fallback.settings()],
  ['legal', routes.fallback.legal()],
];

const entryPoints = [
  ['cold deep link', false],
  ['web refresh', false],
  ['in-app navigation', true],
] as const;

const routeEntryMatrix = routeFallbacks.flatMap(([screen, fallback]) =>
  entryPoints.map(([entryPoint, canGoBack]) => [
    screen,
    entryPoint,
    canGoBack,
    fallback,
  ] as const),
);

describe('navigation fallback matrix', () => {
  it('defines an explicit fallback for each dismissible route', () => {
    expect(routes.fallback.artist()).toBe('/(tabs)');
    expect(routes.fallback.genre()).toBe('/genres');
    expect(routes.fallback.genres()).toBe('/(tabs)');
    expect(routes.fallback.log()).toEqual({
      pathname: '/(tabs)/profile',
      params: { tab: 'timeline' },
    });
    expect(routes.fallback.user()).toBe('/(tabs)');
    expect(routes.fallback.wizard()).toBe('/(tabs)');
    expect(routes.fallback.settings()).toBe('/(tabs)/profile');
    expect(routes.fallback.legal()).toBe('/(auth)/welcome');
  });

  it.each(routeEntryMatrix)(
    '%s handles %s with the expected back destination',
    (_screen, _entryPoint, canGoBack, fallback) => {
      expect(getSafeBackDecision(canGoBack, fallback)).toEqual(
        canGoBack ? { type: 'back' } : { type: 'replace', fallback },
      );
    },
  );

  it('creates stable typed destinations for deep-linkable screens', () => {
    expect(routes.artist('artist-1')).toEqual({
      pathname: '/artist/[id]',
      params: { id: 'artist-1' },
    });
    expect(routes.genre('indie-rock')).toEqual({
      pathname: '/genre/[slug]',
      params: { slug: 'indie-rock' },
    });
    expect(routes.user('listener', { tab: 'timeline' })).toEqual({
      pathname: '/user/[username]',
      params: { username: 'listener', tab: 'timeline' },
    });
    expect(routes.log('log-1')).toEqual({
      pathname: '/log/[id]',
      params: { id: 'log-1' },
    });
    expect(routes.logDeepLink('log-1', 'ivelive-preview')).toBe(
      'ivelive-preview://log/log-1',
    );
  });

  it('sends a log-detail fallback to the log owner diary', () => {
    expect(getLogFallback('listener', false)).toEqual({
      pathname: '/user/[username]',
      params: { username: 'listener', tab: 'timeline' },
    });
    expect(getLogFallback('listener', true)).toEqual({
      pathname: '/(tabs)/profile',
      params: { tab: 'timeline' },
    });
  });
});

describe('return-to path validation', () => {
  it.each([
    '/artist/artist-1',
    '/genre/indie-rock?branch=shoegaze',
    '/log/log-1',
    '/user/listener?tab=timeline',
  ])('accepts internal path %s', (value) => {
    expect(validateReturnTo(value)).toBe(value);
  });

  it.each([
    'https://attacker.example/path',
    '//attacker.example/path',
    '/\\attacker.example/path',
    '/artist/%5c%5cattacker.example',
    'ivelive://artist/artist-1',
    '',
    null,
    `/${'a'.repeat(2048)}`,
  ])('rejects unsafe return target %s', (value) => {
    expect(validateReturnTo(value)).toBeNull();
  });

  describe('web page titles', () => {
    it.each([
      ['/', 'Home'],
      ['/artist/artist-1', 'Artist'],
      ['/genre/indie-rock', 'Genre'],
      ['/log/log-1', 'Concert log'],
      ['/user/listener', 'Profile'],
      ['/missing-route', 'Show cancelled'],
    ])('maps %s to %s', (path, title) => {
      expect(getPageTitle(path)).toBe(title);
    });
  });

  it('rejects cross-origin results even when a caller supplies an origin', () => {
    expect(
      validateReturnTo('https://attacker.example/path', 'https://ivelive.example'),
    ).toBeNull();
  });
});
