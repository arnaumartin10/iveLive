import { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { redeemAlphaInvite } from './api';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

type Props = {
  isLoading: boolean;
  hasStatusError: boolean;
  onRedeemed: () => Promise<void>;
  onRetry: () => void;
};

export function AlphaInviteGate({
  isLoading,
  hasStatusError,
  onRedeemed,
  onRetry,
}: Props) {
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitCode() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setError('');
    try {
      await redeemAlphaInvite(code);
      await onRedeemed();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'We could not check that invite. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Text variant="caption" color="secondary">
          THE IVELIVE ALPHA
        </Text>
        <Text variant="display">Got an invite?</Text>
        <Text variant="body" color="secondary">
          Enter the invite code you received to join the crowd.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : hasStatusError ? (
          <>
            <Text variant="body" color="danger">
              We couldn’t check your invite. Check your connection and try
              again.
            </Text>
            <Button label="Try again" onPress={onRetry} />
          </>
        ) : (
          <>
            <TextInput
              accessibilityLabel="Alpha invite code"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              onChangeText={setCode}
              placeholder="Your invite code"
              placeholderTextColor={colors.inkMuted}
              returnKeyType="done"
              onSubmitEditing={() => void submitCode()}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.ink,
                  color: colors.ink,
                },
              ]}
              value={code}
            />
            {error ? (
              <Text variant="caption" color="danger">
                {error}
              </Text>
            ) : null}
            <Button
              label="Check my invite"
              disabled={!code.trim() || busy}
              loading={busy}
              onPress={() => void submitCode()}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  input: {
    borderBottomWidth: 2,
    fontFamily: 'DMMono_400Regular',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
});
