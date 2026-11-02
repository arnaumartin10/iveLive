import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import RAW from './src/theme/anchors.json';

const envExamplePath = resolve(process.cwd(), '.env.example');
const generatedAssets = './assets/generated';

function pluginName(plugin: NonNullable<ExpoConfig['plugins']>[number]) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

if (existsSync(envExamplePath)) {
  const currentSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const currentSupabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  process.loadEnvFile(envExamplePath);

  if (currentSupabaseUrl !== undefined) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = currentSupabaseUrl;
  }
  if (currentSupabaseKey !== undefined) {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = currentSupabaseKey;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = (config.plugins ?? []).filter(
    (plugin) => pluginName(plugin) !== 'expo-splash-screen',
  );

  return {
    ...config,
    name: config.name ?? 'IveLive',
    slug: config.slug ?? 'ivelive',
    icon: `${generatedAssets}/icon-ios-1024.png`,
    ios: {
      ...config.ios,
      icon: {
        light: `${generatedAssets}/icon-ios-1024.png`,
        dark: `${generatedAssets}/icon-ios-dark-1024.png`,
        tinted: `${generatedAssets}/ios-tinted-1024.png`,
      },
    },
    android: {
      ...config.android,
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
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
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
