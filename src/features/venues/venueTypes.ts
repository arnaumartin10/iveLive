import {
  Building2,
  Drum,
  MapPin,
  Music2,
  PartyPopper,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import { RAW } from '../../theme/palette';

export type StampShape =
  | 'scalloped_circle'
  | 'notched_rect'
  | 'arch'
  | 'octagon'
  | 'pennant'
  | 'blob';

export type VenueTypeDefinition = {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  examples: string[];
  icon: LucideIcon;
  stampShape: StampShape;
  primaryColor: string;
};

export const VENUE_TYPES = {
  festival: {
    key: 'festival',
    label: 'Festival',
    shortLabel: 'Festival',
    description: 'Multi-stage festivals and outdoor music gatherings',
    examples: ['Primavera Sound', 'Sónar', 'Coachella'],
    icon: PartyPopper,
    stampShape: 'scalloped_circle',
    primaryColor: RAW.orange,
  },
  concert_hall_club: {
    key: 'concert_hall_club',
    label: 'Concert Hall / Club',
    shortLabel: 'Hall / Club',
    description: 'Intimate rooms, live halls, and late-night clubs',
    examples: ['Sala Razzmatazz', 'Apolo'],
    icon: Music2,
    stampShape: 'notched_rect',
    primaryColor: RAW.violet,
  },
  stadium: {
    key: 'stadium',
    label: 'Stadium',
    shortLabel: 'Stadium',
    description: 'Large outdoor venues built for landmark shows',
    examples: ['Estadi Olímpic', 'Camp Nou', 'Wembley'],
    icon: Trophy,
    stampShape: 'arch',
    primaryColor: RAW.slate,
  },
  indoor_arena: {
    key: 'indoor_arena',
    label: 'Indoor Arena / Pavilion',
    shortLabel: 'Arena',
    description: 'Indoor arenas, pavilions, and covered venues',
    examples: ['Palau Sant Jordi', 'Pavelló Olímpic'],
    icon: Building2,
    stampShape: 'octagon',
    primaryColor: RAW.mauve,
  },
  festa_major: {
    key: 'festa_major',
    label: 'Festa Major',
    shortLabel: 'Festa Major',
    description: 'Town festivals and open-air street shows',
    examples: ['La Mercè', 'Festa Major de Gràcia'],
    icon: Drum,
    stampShape: 'pennant',
    primaryColor: RAW.orange,
  },
  other: {
    key: 'other',
    label: 'Other / Unique Location',
    shortLabel: 'Other',
    description: 'One-off spaces and places that defy a category',
    examples: [],
    icon: MapPin,
    stampShape: 'blob',
    primaryColor: RAW.slate,
  },
} satisfies Record<string, VenueTypeDefinition>;

export type VenueType = keyof typeof VENUE_TYPES;
export type VenueTypeConfig = (typeof VENUE_TYPES)[VenueType];

export const VENUE_TYPE_ORDER = Object.keys(VENUE_TYPES) as VenueType[];
