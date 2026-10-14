module.exports = {
  extends: ['expo'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    // Reanimated v3+ shared values mutate `.value` by design; React Compiler lint flags this
    'react-hooks/immutability': 'off',
  },
};
