module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@theme': './src/theme',
            '@components': './src/components',
            '@features': './src/features',
            '@lib': './src/lib',
            // Replace lucide-react-native with our custom Paper & Ink icon set
            'lucide-react-native': './src/components/icons/index',
          },
        },
      ],
    ],
  };
};