/**
 * PAPER & INK — Custom Icon Set
 *
 * Built with react-native-svg: chunky 2.5px strokes, square caps,
 * slightly asymmetric, geometric, drawn to feel cut from paper.
 * Drawn on a 24×24 grid.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { RAW } from '../../theme/palette';

export interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
  fill?: string;
  style?: any;
  accessibilityLabel?: string;
}

type IconDef = {
  paths: string[];
  fills?: string[];
  viewBox?: string;
};

export function createIcon(def: IconDef) {
  const IconComponent = ({
    color = RAW.violet,
    size = 24,
    strokeWidth = 2.5,
    fill,
    style,
    accessibilityLabel,
  }: IconProps) => {
    const effectiveFill = fill ?? 'none';
    return (
      <Svg
        width={size}
        height={size}
        viewBox={def.viewBox || '0 0 24 24'}
        style={style}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      >
        {def.fills?.map((d, i) => (
          <Path
            key={`f${i}`}
            d={d}
            fill={fill || color}
          />
        ))}
        {def.paths.map((d, i) => (
          <Path
            key={`p${i}`}
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="square"
            strokeLinejoin="miter"
            fill={effectiveFill}
          />
        ))}
      </Svg>
    );
  };
  IconComponent.displayName = 'PaperIcon';
  return IconComponent;
}

// ─── Core 30+ Paper & Ink Icons (24×24, square caps, 2.5px stroke) ────────────

// CALENDAR (ticket calendar grid)
export const IconCalendar = createIcon({
  paths: [
    'M3 5 H21 V21 H3 Z',
    'M3 10 H21',
    'M8 2.5 V6.5',
    'M16 2.5 V6.5',
    'M7 14 H9',
    'M11 14 H13',
    'M15 14 H17',
    'M7 18 H9',
    'M11 18 H13',
  ],
});

// STATS / BAR CHART (stamped blocks)
export const IconStats = createIcon({
  paths: [
    'M3 21 H21',
    'M5 21 V14 H9 V21',
    'M10.5 21 V8 H14.5 V21',
    'M16 21 V3 H20 V21',
  ],
});

// USERS / FRIENDS (two stamped geometric silhouettes)
export const IconUsers = createIcon({
  paths: [
    'M5 8 H11 V14 H5 Z',
    'M2 21 V18 H14 V21',
    'M13 5 H18 V10 H13 Z',
    'M16 15 H21 V21',
  ],
});

// CLOUD / ORBIT (atomic concert node cloud)
export const IconCloud = createIcon({
  paths: [
    'M12 2 A10 5 0 1 0 12 12 A10 5 0 1 0 12 2',
    'M2 12 A5 10 0 1 0 12 12 A5 10 0 1 0 2 12',
    'M10 10 H14 V14 H10 Z',
  ],
});

// PLUS (chunky stamp cross)
export const IconPlus = createIcon({
  paths: [
    'M12 4 V20',
    'M4 12 H20',
  ],
});

// PLUS CIRCLE
export const IconPlusCircle = createIcon({
  paths: [
    'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2',
    'M12 7 V17',
    'M7 12 H17',
  ],
});

// CLOSE / X (cut tape cross)
export const IconClose = createIcon({
  paths: [
    'M4.5 4.5 L19.5 19.5',
    'M19.5 4.5 L4.5 19.5',
  ],
});

// CHECK (stamp checkmark)
export const IconCheck = createIcon({
  paths: [
    'M4 12.5 L9.5 18 L20 6.5',
  ],
});

// SEARCH (geometric magnifying glass)
export const IconSearch = createIcon({
  paths: [
    'M3 3 H15 V15 H3 Z',
    'M14 14 L21 21',
  ],
});

// TICKET (notched ticket stub)
export const IconTicket = createIcon({
  paths: [
    'M2 5 H22 V10 C20.5 10 19.5 11 19.5 12 C19.5 13 20.5 14 22 14 V19 H2 V14 C3.5 14 4.5 13 4.5 12 C4.5 11 3.5 10 2 10 Z',
    'M9 5 V19',
  ],
});

// STAR (printed 5-point star)
export const IconStar = createIcon({
  paths: [
    'M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 14.1 L17.9 20.6 L12 17.3 L6.1 20.6 L7.4 14.1 L2.5 9.4 L9.1 8.6 Z',
  ],
});

// HEART (geometric angular heart)
export const IconHeart = createIcon({
  paths: [
    'M12 21 L3.5 12.5 C1.5 10.5 1.5 7 3.5 5 C5.5 3 9 3 11 5 L12 6 L13 5 C15 3 18.5 3 20.5 5 C22.5 7 22.5 10.5 20.5 12.5 Z',
  ],
});

// COMMENT (speech balloon with square corners)
export const IconComment = createIcon({
  paths: [
    'M3 4 H21 V16 H7 L3 20 Z',
    'M7 9 H17',
    'M7 12 H13',
  ],
});

// SHARE (tape-connected nodes)
export const IconShare = createIcon({
  paths: [
    'M18 3 H22 V7 H18 Z',
    'M18 17 H22 V21 H18 Z',
    'M2 10 H6 V14 H2 Z',
    'M6 11 L18 5',
    'M6 13 L18 19',
  ],
});

// EDIT / PENCIL (geometric blade/pencil)
export const IconEdit = createIcon({
  paths: [
    'M17 3 L21 7 L8 20 H4 V16 Z',
    'M14 6 L18 10',
  ],
});

// DELETE / TRASH (paper shred bin)
export const IconDelete = createIcon({
  paths: [
    'M4 6 H20',
    'M9 6 V3 H15 V6',
    'M6 6 V20 H18 V6',
    'M10 10 V16',
    'M14 10 V16',
  ],
});

// LOCK (stamped padlock)
export const IconLock = createIcon({
  paths: [
    'M5 10 H19 V21 H5 Z',
    'M8 10 V6 C8 4 9.5 3 12 3 C14.5 3 16 4 16 6 V10',
    'M12 14 V17',
  ],
});

// BELL (geometric notification bell)
export const IconBell = createIcon({
  paths: [
    'M18 9 C18 6 15.5 4 12 4 C8.5 4 6 6 6 9 V16 L4 18 H20 L18 16 Z',
    'M10 19 C10 20.5 11 21.5 12 21.5 C13 21.5 14 20.5 14 19',
  ],
});

// RECORD / VINYL DISC (grooved vinyl)
export const IconRecord = createIcon({
  paths: [
    'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2',
    'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6',
    'M12 10 A2 2 0 1 0 12 14 A2 2 0 1 0 12 10',
  ],
});

// VENUE: HALL / CLUB (ticket rectangle with notch)
export const IconHallClub = createIcon({
  paths: [
    'M2 7 H22 V17 H2 Z',
    'M7 7 V17',
    'M14 11 H18',
  ],
});

// VENUE: FESTIVAL (scalloped starburst)
export const IconFestival = createIcon({
  paths: [
    'M12 2 L14 7 L19 5 L17 10 L22 12 L17 14 L19 19 L14 17 L12 22 L10 17 L5 19 L7 14 L2 12 L7 10 L5 5 L10 7 Z',
  ],
});

// VENUE: STADIUM (grand arch)
export const IconStadium = createIcon({
  paths: [
    'M3 21 V10 C3 5 7 3 12 3 C17 3 21 5 21 10 V21',
    'M8 21 V12 C8 9.5 9.8 8 12 8 C14.2 8 16 9.5 16 12 V21',
    'M3 16 H21',
  ],
});

// VENUE: ARENA (octagon arena)
export const IconArena = createIcon({
  paths: [
    'M8 3 H16 L21 8 V16 L16 21 H8 L3 16 V8 Z',
    'M9 9 H15 V15 H9 Z',
  ],
});

// VENUE: FESTA MAJOR (bunting pennants)
export const IconFestaMajor = createIcon({
  paths: [
    'M2 5 Q12 10 22 5',
    'M3 6 L7 15 L10 7',
    'M11 7 L15 16 L18 6',
  ],
});

// VENUE: OTHER / MAP PIN (stamped marker)
export const IconMapPin = createIcon({
  paths: [
    'M12 2 C8 2 5 5 5 9 C5 14.5 12 22 12 22 C12 22 19 14.5 19 9 C19 5 16 2 12 2 Z',
    'M10 9 H14 V11 H10 Z',
  ],
});

// MAXIMIZE
export const IconMaximize = createIcon({
  paths: [
    'M15 3 H21 V9',
    'M9 21 H3 V15',
    'M21 3 L14 10',
    'M3 21 L10 14',
  ],
});

// WISHLIST / BOOKMARK
export const IconWishlist = createIcon({
  paths: [
    'M5 3 H19 V21 L12 16.5 L5 21 Z',
  ],
});

// SPARKLES (geometric riso stars)
export const IconSparkles = createIcon({
  paths: [
    'M12 2 L13.5 9 L20.5 10.5 L13.5 12 L12 19 L10.5 12 L3.5 10.5 L10.5 9 Z',
    'M4 3 L4.5 5 L6.5 5.5 L4.5 6 L4 8 L3.5 6 L1.5 5.5 L3.5 5 Z',
    'M19 15 L19.5 17 L21.5 17.5 L19.5 18 L19 20 L18.5 18 L16.5 17.5 L18.5 17 Z',
  ],
});

// ARROWS & CHEVRONS
export const IconArrowLeft = createIcon({
  paths: ['M20 12 H4', 'M11 5 L4 12 L11 19'],
});
export const IconArrowRight = createIcon({
  paths: ['M4 12 H20', 'M13 5 L20 12 L13 19'],
});
export const IconArrowUpRight = createIcon({
  paths: ['M7 17 L17 7', 'M7 7 H17 V17'],
});
export const IconChevronLeft = createIcon({
  paths: ['M15 5 L8 12 L15 19'],
});
export const IconChevronRight = createIcon({
  paths: ['M9 5 L16 12 L9 19'],
});
export const IconChevronDown = createIcon({
  paths: ['M5 9 L12 16 L19 9'],
});
export const IconChevronUp = createIcon({
  paths: ['M5 15 L12 8 L19 15'],
});

// INFO & ALERTS
export const IconInfo = createIcon({
  paths: [
    'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2',
    'M12 11 V17',
    'M11 7 H13 V9 H11 Z',
  ],
});
export const IconWarning = createIcon({
  paths: [
    'M12 3 L22 20 H2 Z',
    'M12 9 V14',
    'M11.5 17 H12.5',
  ],
});
export const IconAlert = createIcon({
  paths: [
    'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2',
    'M12 8 V13',
    'M11.5 16 H12.5',
  ],
});

// SETTINGS / SLIDERS
export const IconSettings = createIcon({
  paths: [
    'M3 6 H21',
    'M7 4 V8',
    'M3 12 H21',
    'M15 10 V14',
    'M3 18 H21',
    'M11 16 V20',
  ],
});

// CAMERA
export const IconCamera = createIcon({
  paths: [
    'M4 7 H8 L9.5 4 H14.5 L16 7 H20 V20 H4 Z',
    'M12 10 A3.5 3.5 0 1 0 12 17 A3.5 3.5 0 1 0 12 10',
  ],
});

// FILM / REEL
export const IconFilm = createIcon({
  paths: [
    'M3 4 H21 V20 H3 Z',
    'M8 4 V20',
    'M16 4 V20',
    'M3 8 H8',
    'M16 8 H21',
    'M3 16 H8',
    'M16 16 H21',
  ],
});

export const IconVolumeOff = createIcon({
  paths: [
    'M3 9 H7 L12 5 V19 L7 15 H3 Z',
    'M16 9 L21 15',
    'M21 9 L16 15',
  ],
});

// IMAGE & IMAGE PLUS
export const IconImage = createIcon({
  paths: [
    'M3 5 H21 V19 H3 Z',
    'M8.5 10 A1.5 1.5 0 1 0 8.5 13 A1.5 1.5 0 1 0 8.5 10',
    'M21 15 L16 10 L6 20',
  ],
});
export const IconImagePlus = createIcon({
  paths: [
    'M16 5 H22',
    'M19 2 V8',
    'M21 11.5 V19 A2 2 0 0 1 19 21 H5 A2 2 0 0 1 3 19 V5 A2 2 0 0 1 5 3 H12.5',
    'M21 15 L18 12 L6 21',
    'M9 9 A2 2 0 1 0 9 13 A2 2 0 1 0 9 9',
  ],
});

// FLAG
export const IconFlag = createIcon({
  paths: [
    'M5 3 V21',
    'M5 4 H18 L15 9 L18 14 H5',
  ],
});

// LOCATE / COMPASS
export const IconLocate = createIcon({
  paths: [
    'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2',
    'M12 2 V6',
    'M12 18 V22',
    'M2 12 H6',
    'M18 12 H22',
    'M11 11 H13 V13 H11 Z',
  ],
});

// PLAY & PAUSE
export const IconPlay = createIcon({
  paths: ['M6 4 L20 12 L6 20 Z'],
});
export const IconPause = createIcon({
  paths: ['M6 4 H10 V20 H6 Z', 'M14 4 H18 V20 H14 Z'],
});

// BAN
export const IconBan = createIcon({
  paths: [
    'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2',
    'M5 5 L19 19',
  ],
});

// SEND
export const IconSend = createIcon({
  paths: [
    'M2 3 L22 12 L2 21 L6 12 Z',
    'M6 12 H14',
  ],
});

// MORE HORIZONTAL
export const IconMoreHorizontal = createIcon({
  paths: [
    'M5 11 H7 V13 H5 Z',
    'M11 11 H13 V13 H11 Z',
    'M17 11 H19 V13 H17 Z',
  ],
});

// GRID & HORIZONTAL LIST
export const IconGrid = createIcon({
  paths: [
    'M3 3 H10 V10 H3 Z',
    'M14 3 H21 V10 H14 Z',
    'M3 14 H10 V21 H3 Z',
    'M14 14 H21 V21 H14 Z',
  ],
});
export const IconGallery = createIcon({
  paths: [
    'M3 6 H21 V18 H3 Z',
    'M7 6 V18',
    'M17 6 V18',
  ],
});

// HISTORY
export const IconHistory = createIcon({
  paths: [
    'M12 3 A9 9 0 1 0 21 12 H18',
    'M12 7 V12 L16 14',
  ],
});

// MAIL
export const IconMail = createIcon({
  paths: [
    'M3 5 H21 V19 H3 Z',
    'M3 7 L12 13 L21 7',
  ],
});

// CROWN
export const IconCrown = createIcon({
  paths: [
    'M3 18 L5 8 L10 12 L12 5 L14 12 L19 8 L21 18 Z',
    'M3 18 H21 V20 H3 Z',
  ],
});

// EYE & EYE OFF
export const IconEye = createIcon({
  paths: [
    'M2 12 C4 7 8 4 12 4 C16 4 20 7 22 12 C20 17 16 20 12 20 C8 20 4 17 2 12 Z',
    'M10 12 A2 2 0 1 0 14 12 A2 2 0 1 0 10 12',
  ],
});
export const IconEyeOff = createIcon({
  paths: [
    'M2 2 L22 22',
    'M6 7 C4 9 3 11 2 12 C4 17 8 20 12 20 C14 20 16 19 18 18',
    'M9 4.5 C10 4 11 4 12 4 C16 4 20 7 22 12 C21 14 19.5 16 18 17.5',
  ],
});

// USER PLUS, USER CHECK, USER X
export const IconUserPlus = createIcon({
  paths: [
    'M5 8 H11 V14 H5 Z',
    'M2 21 V18 H14 V21',
    'M18 9 V15',
    'M15 12 H21',
  ],
});
export const IconUserCheck = createIcon({
  paths: [
    'M5 8 H11 V14 H5 Z',
    'M2 21 V18 H14 V21',
    'M15 12 L18 15 L22 10',
  ],
});
export const IconUserX = createIcon({
  paths: [
    'M5 8 H11 V14 H5 Z',
    'M2 21 V18 H14 V21',
    'M16 10 L21 15',
    'M21 10 L16 15',
  ],
});

// FALLBACK ICON
const IconDefault = createIcon({
  paths: [
    'M4 4 H20 V20 H4 Z',
    'M8 8 H16 V16 H8 Z',
  ],
});

// ─── Lucide compatibility shims ───────────────────────────────────────────────
export const CalendarDays       = IconCalendar;
export const Calendar           = IconCalendar;
export const BarChart3          = IconStats;
export const Users              = IconUsers;
export const Orbit              = IconCloud;
export const Plus               = IconPlus;
export const PlusCircle         = IconPlusCircle;
export const X                  = IconClose;
export const Check              = IconCheck;
export const Search             = IconSearch;
export const Ticket             = IconTicket;
export const Star               = IconStar;
export const Heart              = IconHeart;
export const MessageSquare      = IconComment;
export const MessageCircle      = IconComment;
export const Share2             = IconShare;
export const Pencil             = IconEdit;
export const Trash2             = IconDelete;
export const LockKeyhole        = IconLock;
export const Bell               = IconBell;
export const Disc3              = IconRecord;
export const Disc               = IconRecord;
export const Music2             = IconHallClub;
export const Music              = IconHallClub;
export const Building2          = IconArena;
export const MapPin             = IconMapPin;
export const PartyPopper        = IconFestival;
export const Drum               = IconFestaMajor;
export const Trophy             = IconStadium;
export const Maximize2          = IconMaximize;
export const Sparkles           = IconSparkles;
export const ArrowLeft          = IconArrowLeft;
export const ArrowRight         = IconArrowRight;
export const ArrowUpRight       = IconArrowUpRight;
export const ChevronRight       = IconChevronRight;
export const ChevronLeft        = IconChevronLeft;
export const ChevronDown        = IconChevronDown;
export const ChevronUp          = IconChevronUp;
export const Info               = IconInfo;
export const TriangleAlert      = IconWarning;
export const AlertCircle        = IconAlert;
export const BookmarkIcon       = IconWishlist;
export const Settings           = IconSettings;
export const ListFilter         = IconSettings;
export const SortDesc           = IconArrowRight;
export const ExternalLink       = IconArrowUpRight;
export const RotateCcw          = IconHistory;
export const RotateCw           = IconHistory;
export const Globe              = IconCloud;
export const Headphones         = IconRecord;
export const Camera             = IconCamera;
export const Clapperboard       = IconFilm;
export const Film               = IconFilm;
export const VolumeOff          = IconVolumeOff;
export const Flag               = IconFlag;
export const LocateFixed        = IconLocate;
export const Pause              = IconPause;
export const Play               = IconPlay;
export const Ban                = IconBan;
export const Send               = IconSend;
export const MoreHorizontal     = IconMoreHorizontal;
export const GalleryHorizontal  = IconGallery;
export const Grid2X2            = IconGrid;
export const History            = IconHistory;
export const Mail               = IconMail;
export const Crown              = IconCrown;
export const Volume2            = IconRecord;
export const Compass            = IconLocate;
export const Flame              = IconFestival;
export const TrendingUp         = IconStats;
export const Award              = IconCrown;
export const Zap                = IconSparkles;
export const SlidersHorizontal  = IconSettings;
export const Eye                = IconEye;
export const EyeOff             = IconEyeOff;
export const UserPlus           = IconUserPlus;
export const UserCheck          = IconUserCheck;
export const UserX              = IconUserX;
export const ArrowUp           = IconChevronUp;
export const ArrowDown         = IconChevronDown;
export const Filter            = IconSettings;
export const FilterX           = IconSettings;
export const LogOut            = IconArrowRight;
export const ShieldCheck       = IconCheck;
export const RefreshCw         = IconHistory;
export const CheckCircle2      = IconCheck;
export const Edit3             = IconEdit;
export const UserCheck2        = IconUserCheck;
export const ImagePlus         = IconImagePlus;
export const Image             = IconImage;
export const ImageIcon         = IconImage;


export type LucideIcon = typeof IconCalendar;

// Default export as proxy so ANY unlisted lucide import safely falls back
const iconExportMap: Record<string, any> = {
  CalendarDays, Calendar, BarChart3, Users, Orbit, Plus, PlusCircle, X, Check,
  Search, Ticket, Star, Heart, MessageSquare, MessageCircle, Share2, Pencil,
  Trash2, LockKeyhole, Bell, Disc3, Disc, Music2, Music, Building2, MapPin,
  PartyPopper, Drum, Trophy, Maximize2, Sparkles, ArrowLeft, ArrowRight,
  ArrowUpRight, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Info,
  TriangleAlert, AlertCircle, BookmarkIcon, Settings, ListFilter, SortDesc,
  ExternalLink, RotateCcw, RotateCw, Globe, Headphones, Camera, Flag,
  LocateFixed, Pause, Play, Ban, Send, MoreHorizontal, GalleryHorizontal,
  Grid2X2, History, Mail, Crown, Volume2, Compass, Flame, TrendingUp, Award,
  Zap, SlidersHorizontal, Eye, EyeOff, UserPlus, UserCheck, UserX,
  ImagePlus, Image, ImageIcon,
};

export default new Proxy(iconExportMap, {
  get: (target, prop: string) => {
    if (prop in target) return target[prop];
    return IconDefault;
  },
});
