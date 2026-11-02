import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from '../src/components/home/HomeScreen';
import { ThemeProvider } from '../src/theme/ThemeProvider';

describe('home screen', () => {
  it('renders the paper welcome and theme controls', () => {
    render(
      <ThemeProvider>
        <HomeScreen />
      </ThemeProvider>,
    );

    expect(screen.getByText('Every show leaves a mark.')).toBeTruthy();
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText('Bright')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.getByText('Dark mode')).toBeTruthy();
  });
});
