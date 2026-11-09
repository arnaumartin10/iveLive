import type { VenueType } from './venueTypes';

export interface VenueSearchResult {
  id: string;
  name: string;
  venueType: VenueType;
  city: string | null;
  country: string | null;
  externalId: string | null;
}
