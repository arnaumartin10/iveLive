import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Text';
import { useTheme } from '../theme/ThemeProvider';
import { routes } from '../navigation/routes';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text variant="overline" color="secondary">
        NOT FOUND
      </Text>
      <Text variant="headline" center>
        Show cancelled
      </Text>
      <Text variant="body" color="secondary" center>
        That page is no longer available. Head home to keep exploring.
      </Text>
      <Button label="Go home" onPress={() => router.replace(routes.home())} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
});
