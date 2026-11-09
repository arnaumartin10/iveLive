import { routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../theme/ThemeProvider';

export default function TermsScreen() {
  const { colors } = useTheme();
  const safeBack = useSafeBack(routes.fallback.legal());

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={safeBack}
          style={styles.back}
        >
          <ArrowLeft color={colors.ink} size={20} />
        </Pressable>
        <View style={styles.heading}>
          <Text variant="display">Terms of Service</Text>
          <Text variant="caption" color="secondary">
            Placeholder legal information
          </Text>
        </View>
        <Text variant="body" color="secondary">
          These terms are a placeholder and are not legal advice. The final
          terms for IveLive will describe account responsibilities, acceptable
          use, ownership of submitted content, and how the service may change.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: 24, padding: 24 },
  back: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  heading: { gap: 6 },
});
