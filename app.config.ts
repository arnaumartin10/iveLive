import type { ConfigContext, ExpoConfig } from 'expo/config';
import RAW from './src/theme/anchors.json';

const generatedAssets = './assets/generated';
const appEnvironments = ['development', 'preview', 'production'] as const;
type AppEnvironment = (typeof appEnvironments)[number];

function pluginName(plugin: NonNullable<ExpoConfig['plugins']>[number]) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

function getAppEnvironment(): AppEnvironment {
  const value =
    process.env.APP_ENV ||
    process.env.EAS_BUILD_PROFILE ||
    process.env.VERCEL_ENV;
  if (!value && process.env.VERCEL === '1') {
    throw new Error('Set APP_ENV to preview or production in Vercel settings.');
  }
  const selectedEnvironment = value ?? 'development';
  const appEnvironment = appEnvironments.find(
    (environment) => environment === selectedEnvironment,
  );
  if (!appEnvironment) {
    throw new Error(`APP_ENV must be one of: ${appEnvironments.join(', ')}.`);
  }
  return appEnvironment;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnvironment = getAppEnvironment();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY for the ${appEnvironment} environment.`,
    );
  }
  let parsedSupabaseUrl: URL;
  try {
    parsedSupabaseUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(
      `EXPO_PUBLIC_SUPABASE_URL for the ${appEnvironment} environment must be a valid URL.`,
    );
  }
  if (
    parsedSupabaseUrl.protocol !== 'https:' &&
    parsedSupabaseUrl.protocol !== 'http:'
  ) {
    throw new Error(
      `EXPO_PUBLIC_SUPABASE_URL for the ${appEnvironment} environment must use HTTP or HTTPS.`,
    );
  }
  const appSuffix =
    appEnvironment === 'production'
      ? ''
      : appEnvironment === 'preview'
        ? ' Preview'
        : ' Dev';
  const schemeSuffix =
    appEnvironment === 'production' ? '' : `-${appEnvironment}`;
  const bundleSuffix =
    appEnvironment === 'production' ? '' : `.${appEnvironment}`;
  const plugins = (config.plugins ?? []).filter(
    (plugin) => pluginName(plugin) !== 'expo-splash-screen',
  );

  return {
    ...config,
    name: `${config.name ?? 'iveLive'}${appSuffix}`,
    slug: config.slug ?? 'ivelive',
    scheme: `ivelive${schemeSuffix}`,
    runtimeVersion: { policy: 'appVersion' },
    icon: `${generatedAssets}/icon-ios-1024.png`,
    ios: {
      ...config.ios,
      bundleIdentifier: `com.ivelive.app${bundleSuffix}`,
      icon: {
        light: `${generatedAssets}/icon-ios-1024.png`,
        dark: `${generatedAssets}/icon-ios-dark-1024.png`,
        tinted: `${generatedAssets}/ios-tinted-1024.png`,
      },
    },
    android: {
      ...config.android,
      package: `com.ivelive.app${bundleSuffix}`,
      adaptiveIcon: {
        foregroundImage: `${generatedAssets}/adaptive-foreground-1024.png`,
        backgroundColor: RAW.violet,
        monochromeImage: `${generatedAssets}/adaptive-monochrome-1024.png`,
      },
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        'android.permission.RECORD_AUDIO',
      ],
    },
    web: {
      ...config.web,
      favicon: `${generatedAssets}/favicon-48.png`,
    },
    extra: {
      ...config.extra,
      appEnvironment,
      alphaInviteOnly: appEnvironment !== 'development',
      supabaseUrl,
      supabaseAnonKey,
    },
    plugins: [
      ...plugins,
      [
        'expo-splash-screen',
        {
          image: `${generatedAssets}/splash-mascot.png`,
          imageWidth: 230,
          resizeMode: 'contain',
          backgroundColor: RAW.wheat,
          dark: {
            image: `${generatedAssets}/splash-mascot-dark.png`,
            backgroundColor: RAW.violet,
          },
        },
      ],
      [
        'expo-notifications',
        {
          icon: `${generatedAssets}/notification-icon-96.png`,
          color: RAW.orange,
        },
      ],
      [
        'expo-audio',
        {
          microphonePermission: false,
          recordAudioAndroid: false,
          enableBackgroundPlayback: false,
        },
      ],
      [
        'expo-media-library',
        {
          photosPermission: 'Allow IveLive to add your Atlas poster to Photos.',
          savePhotosPermission: 'Allow IveLive to save your Atlas poster.',
        },
      ],
    ],
  };
};
