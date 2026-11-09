import { countryNameFromCode } from './location';

export const CONCERT_SEARCH_COUNTRIES = [
  'AR',
  'AU',
  'AT',
  'BE',
  'BR',
  'CA',
  'CL',
  'CO',
  'CZ',
  'DK',
  'FI',
  'FR',
  'DE',
  'HK',
  'HU',
  'IE',
  'IL',
  'IT',
  'JP',
  'MX',
  'NL',
  'NZ',
  'NO',
  'PL',
  'PT',
  'SG',
  'ZA',
  'KR',
  'ES',
  'SE',
  'CH',
  'TW',
  'TR',
  'AE',
  'GB',
  'US',
] as const;

export function getConcertSearchCountries() {
  return CONCERT_SEARCH_COUNTRIES.map((code) => ({
    code,
    name: countryNameFromCode(code),
  })).sort((a, b) => a.name.localeCompare(b.name));
}
