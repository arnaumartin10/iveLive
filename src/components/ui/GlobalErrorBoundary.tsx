import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ticket } from '../paper/Ticket';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[IveLive] Unhandled application error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback onRetry={() => this.setState({ hasError: false })} />
      );
    }

    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Ticket serialNumber="IL-SHOW-CANCELLED" hasBarcode={false}>
        <Text variant="label" color="accent" center>
          SHOW CANCELLED
        </Text>
        <Text variant="headline" center style={styles.title}>
          We lost the setlist.
        </Text>
        <Text variant="body" color="secondary" center style={styles.message}>
          The app could not load this screen. Your saved shows are still here.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={[
            styles.button,
            { backgroundColor: colors.accent, borderColor: colors.ink },
          ]}
        >
          <Text variant="label" color="accentInk">
            Try again
          </Text>
        </Pressable>
      </Ticket>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: { marginTop: 12 },
  message: { marginTop: 8 },
  button: {
    alignSelf: 'center',
    borderWidth: 1.5,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});