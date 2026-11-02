const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  ...expoConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: [
      'src/components/ui/ArtistAvatar.tsx',
      'src/components/ui/Button.tsx',
      'src/components/ui/SegmentedControl.tsx',
      'src/components/ui/Skeleton.tsx',
      'src/components/navigation/CustomTabBar.tsx',
      'src/components/social/FeedCard.tsx',
      'src/app/log/index.tsx',
    ],
    rules: { 'react-hooks/immutability': 'off' },
  },
  prettierConfig,
];
