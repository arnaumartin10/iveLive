import { jest } from '@jest/globals';

process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

jest.mock('react-native-reanimated', () => require('./mocks/reanimated'));

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    pause: jest.fn(),
    muted: true,
  })),
  VideoView: () => null,
  createVideoPlayer: jest.fn(() => ({
    generateThumbnailsAsync: jest.fn(async () => []),
    release: jest.fn(),
  })),
}));

jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

jest.mock('react-native-svg', () => {
  const mockComponent = () => null;
  return {
    __esModule: true,
    default: mockComponent,
    Svg: mockComponent,
    Path: mockComponent,
    Rect: mockComponent,
    Circle: mockComponent,
    Line: mockComponent,
    G: mockComponent,
    Polygon: mockComponent,
    Polyline: mockComponent,
    Defs: mockComponent,
    LinearGradient: mockComponent,
    RadialGradient: mockComponent,
    Stop: mockComponent,
    ClipPath: mockComponent,
    Pattern: mockComponent,
    Mask: mockComponent,
  };
});

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  useNavigation: jest.fn(() => ({ setOptions: jest.fn() })),
  useSegments: jest.fn(() => []),
  Stack: { Screen: () => null },
  Slot: () => null,
}));

jest.mock('lucide-react-native', () => {
  const MockIcon = () => null;

  return new Proxy(
    {},
    {
      get: (_target, iconName) => (iconName === '__esModule' ? true : MockIcon),
    },
  );
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: () => null,
  Circle: () => null,
  Group: () => null,
  Image: () => null,
  Line: () => null,
  LinearGradient: () => null,
  Path: () => null,
  Rect: () => null,
  BlurMask: () => null,
  useImage: () => null,
  vec: (x = 0, y = 0) => ({ x, y }),
  FontWeight: { Bold: 700, Medium: 500, Black: 900 },
  ImageFormat: { PNG: 0, JPEG: 1 },
  Skia: {
    Path: {
      Make: () => ({
        addArc: () => undefined,
        addCircle: () => undefined,
      }),
    },
    Paint: () => ({
      setColor: () => undefined,
      setAlphaf: () => undefined,
      setAntiAlias: () => undefined,
      setShader: () => undefined,
    }),
    Color: (c: string) => c,
    FontMgr: { System: () => ({ matchFamilyStyle: () => ({}) }) },
    Font: () => ({}),
    RRectXY: () => ({}),
    XYWHRect: () => ({}),
    Shader: { MakeLinearGradient: () => ({}) },
    Surface: {
      MakeOffscreen: () => ({
        getCanvas: () => ({
          drawRect: () => undefined,
          drawText: () => undefined,
          drawRRect: () => undefined,
          save: () => undefined,
          restore: () => undefined,
          clipPath: () => undefined,
          drawImageRect: () => undefined,
        }),
        makeImageSnapshot: () => ({ encodeToBytes: () => new Uint8Array() }),
      }),
    },
  },
}));
