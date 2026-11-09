import { describe, expect, it } from '@jest/globals';
import {
  CONCERT_SEARCH_COUNTRIES,
  getConcertSearchCountries,
} from '../src/features/home/concertCountries';

describe('concert search countries', () => {
  it('offers an expanded, alphabetically labeled set of Ticketmaster markets', () => {
    const countries = getConcertSearchCountries();

    expect(CONCERT_SEARCH_COUNTRIES.length).toBeGreaterThan(26);
    expect(countries.map(({ name }) => name)).toEqual(
      [...countries.map(({ name }) => name)].sort((a, b) => a.localeCompare(b)),
    );
    expect(countries.map(({ code }) => code)).toContain('ZA');
    expect(countries.map(({ code }) => code)).toContain('TW');
    expect(countries.every(({ name }) => name.length > 0)).toBe(true);
  });
});
