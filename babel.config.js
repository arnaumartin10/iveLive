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
          root: ['./'],
          alias: {
            '@': './src',
            '@theme': './src/theme',
            '@components': './src/components',
            '@features': './src/features',
            '@lib': './src/lib',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
