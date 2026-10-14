/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        crimson: '#FB3640',
        navy: '#031927',
        amber: '#F2AF29',
        steel: '#508AA8',
        ivory: '#E0E0CE',
        surface0: '#080F15',
        surface1: '#0D1821',
        surface2: '#152233',
        surface3: '#1E3045',
        border: '#1F3347',
        muted: '#4A6A82',
        textSecondary: '#8AA8BC',
        textPrimary: '#E0E0CE',
      },
      fontFamily: {
        regular: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        black: ['Inter_900Black'],
      },
    },
  },
  plugins: [],
};
