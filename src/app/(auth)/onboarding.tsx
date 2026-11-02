import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Music2,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Text } from '../../components/ui/Text';
import { Sticker } from '../../components/paper';
import { AlphaInviteGate } from '../../features/auth/AlphaInviteGate';
import { hasAlphaInvite } from '../../features/auth/api';
import {
  useMe,
  useUpdateProfile,
  useUsernameAvailability,
} from '../../features/auth/hooks';
import { useAuthStore } from '../../features/auth/store';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

const usernamePattern = /^[a-z0-9_.]{3,20}$/;

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const alphaInviteOnly = Constants.expoConfig?.extra?.alphaInviteOnly === true;
  const user = useAuthStore((state) => state.user);
  const profileQuery = useMe();
  const alphaInviteQuery = useQuery({
    queryKey: ['alpha-invite-status', user?.id],
    queryFn: hasAlphaInvite,
    enabled: alphaInviteOnly && Boolean(user?.id),
  });
  const updateProfile = useUpdateProfile(user?.id ?? '');
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState(() => {
    const current = profileQuery.data?.username;
    return current && !current.startsWith('user_') ? current : '';
  });
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [displayName, setDisplayName] = useState(
    () => profileQuery.data?.display_name ?? '',
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    () => profileQuery.data?.avatar_url ?? null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const usernameMessage = usernameValidationMessage(username);
  const usernameValid = usernamePattern.test(username);
  const usernameQuery = useUsernameAvailability(
    debouncedUsername,
    usernameValid && debouncedUsername === username,
  );

  useEffect(() => {
    if (!usernameValid) return;
    const timeout = setTimeout(() => setDebouncedUsername(username), 400);
    return () => clearTimeout(timeout);
  }, [username, usernameValid]);

  function continueFromUsername() {
    if (!usernameValid) return;
    if (usernameQuery.data !== true) return;
    setError('');
    setStep(2);
  }

  async function chooseAvatar() {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setAvatarPreview(asset.uri);
      const cropSize = Math.min(asset.width, asset.height);
      const processed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [
          {
            crop: {
              originX: Math.round((asset.width - cropSize) / 2),
              originY: Math.round((asset.height - cropSize) / 2),
              width: cropSize,
              height: cropSize,
            },
          },
          { resize: { width: 512, height: 512 } },
        ],
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG },
      );
      const response = await fetch(processed.uri);
      const imageData = await response.arrayBuffer();
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, imageData, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      setAvatarPreview(processed.uri);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not upload that photo.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function finishOnboarding(openLog: boolean) {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      await updateProfile.mutateAsync({
        username,
        display_name: displayName.trim(),
        avatar_url: avatarUrl,
      });
      router.replace(openLog ? '/log' : '/(tabs)');
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'Could not save your profile.';
      setError(
        message.toLowerCase().includes('duplicate') || message.includes('23505')
          ? 'That username is already taken. Try another one.'
          : message,
      );
      setStep(1);
    } finally {
      setBusy(false);
    }
  }

  const availabilityMessage = usernameQuery.isFetching
    ? 'Checking availability…'
    : usernameQuery.isError
      ? 'Could not check availability. Check your connection and try again.'
      : usernameQuery.data === true
        ? 'That username is available.'
        : usernameQuery.data === false
          ? 'That username is already taken.'
          : '';

  if (
    alphaInviteOnly &&
    (alphaInviteQuery.isLoading ||
      alphaInviteQuery.isError ||
      alphaInviteQuery.data !== true)
  ) {
    return (
      <AlphaInviteGate
        hasStatusError={alphaInviteQuery.isError}
        isLoading={alphaInviteQuery.isLoading}
        onRedeemed={async () => {
          await alphaInviteQuery.refetch();
        }}
        onRetry={() => void alphaInviteQuery.refetch()}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          {step > 1 && step < 4 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => setStep(step - 1)}
              style={styles.backButton}
            >
              <ArrowLeft color={colors.ink} size={20} />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text variant="caption" color="secondary">
            YOUR IVELIVE PROFILE
          </Text>
          <Text variant="caption" color="secondary">
            {step} / 4
          </Text>
        </View>

        <View style={[styles.progressTrack, { borderColor: colors.line }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.accent, width: `${step * 25}%` },
            ]}
          />
        </View>

        {step === 1 ? (
          <View style={styles.stepContent}>
            <Text variant="display">Claim your name.</Text>
            <Text variant="body" color="secondary">
              This is how friends will find you in the live music crowd.
            </Text>
            <View style={styles.usernameField}>
              <Text variant="title" style={{ color: colors.inkMuted }}>
                @
              </Text>
              <TextInput
                accessibilityLabel="Username"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                onChangeText={(value) => setUsername(value.toLowerCase())}
                placeholder="yourname"
                placeholderTextColor={colors.inkMuted}
                style={[
                  styles.input,
                  { borderBottomColor: colors.line, color: colors.ink },
                ]}
                value={username}
              />
              {usernameQuery.data === true ? (
                <Check color={colors.positive} size={19} />
              ) : null}
              {usernameQuery.isFetching ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : null}
            </View>
            <Text
              variant="caption"
              color={
                usernameValid
                  ? usernameQuery.data === false
                    ? 'danger'
                    : 'secondary'
                  : 'danger'
              }
            >
              {usernameMessage ||
                availabilityMessage ||
                '3–20 characters: lowercase letters, numbers, dots, underscores.'}
            </Text>
            <Button
              label="Tear here to continue"
              rightIcon={<ArrowRight color={colors.accentInk} size={17} />}
              disabled={!usernameValid || usernameQuery.data !== true}
              onPress={continueFromUsername}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepContent}>
            <Text variant="display">What should we call you?</Text>
            <Text variant="body" color="secondary">
              Your display name appears on your profile and show memories.
            </Text>
            <TextInput
              accessibilityLabel="Display name"
              autoCapitalize="words"
              onChangeText={setDisplayName}
              placeholder="Display name"
              placeholderTextColor={colors.inkMuted}
              style={[
                styles.inputBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  color: colors.ink,
                },
              ]}
              value={displayName}
            />
            <Button
              label="Continue"
              rightIcon={<ArrowRight color={colors.accentInk} size={17} />}
              disabled={!displayName.trim()}
              onPress={() => setStep(3)}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.stepContent}>
            <Text variant="display">Add a little face.</Text>
            <Text variant="body" color="secondary">
              A photo makes it easier for friends to spot you.
            </Text>
            <View style={styles.avatarArea}>
              {avatarPreview || avatarUrl ? (
                <Sticker id="onboarding-avatar" size={110} tilt={false}>
                  <Image
                    source={{ uri: avatarPreview ?? avatarUrl ?? undefined }}
                    contentFit="cover"
                    style={styles.avatarPreview}
                  />
                </Sticker>
              ) : (
                <Avatar
                  fallbackGenre="unclassified"
                  name={displayName || username}
                  size="xl"
                />
              )}
            </View>
            <Button
              variant="secondary"
              label={avatarUrl ? 'Change photo' : 'Choose a photo'}
              leftIcon={<Camera color={colors.ink} size={18} />}
              loading={busy}
              onPress={chooseAvatar}
            />
            <Button
              label="Continue"
              rightIcon={<ArrowRight color={colors.accentInk} size={17} />}
              onPress={() => setStep(4)}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep(4)}
              style={styles.skipLink}
            >
              <Text variant="caption" color="secondary">
                Skip for now
              </Text>
            </Pressable>
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.stepContent}>
            <View
              style={[
                styles.finishIcon,
                { backgroundColor: `${colors.accent}22` },
              ]}
            >
              <Music2 color={colors.accent} size={26} />
            </View>
            <Text variant="display">Your first show?</Text>
            <Text variant="body" color="secondary">
              Start your timeline with the concert that still gives you
              goosebumps.
            </Text>
            <Card style={styles.finishCard}>
              <Text variant="title">@{username}</Text>
              <Text variant="caption" color="secondary">
                {displayName}
              </Text>
            </Card>
            <Button
              label="Log your first show"
              rightIcon={<ArrowRight color={colors.accentInk} size={17} />}
              loading={busy}
              onPress={() => finishOnboarding(true)}
            />
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => finishOnboarding(false)}
              style={styles.skipLink}
            >
              <Text variant="caption" color="secondary">
                I’ll do this later
              </Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color="danger">
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function usernameValidationMessage(value: string) {
  if (!value) return 'Choose a username to continue.';
  if (value.length < 3) return 'Use at least 3 characters.';
  if (value.length > 20) return 'Use 20 characters or fewer.';
  if (!usernamePattern.test(value))
    return 'Use lowercase letters, numbers, dots, and underscores.';
  return '';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flexGrow: 1, gap: 28, padding: 24, paddingBottom: 40 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  progressTrack: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    height: 7,
    overflow: 'hidden',
  },
  progressFill: { height: 5 },
  stepContent: { flex: 1, gap: 17, paddingTop: 30 },
  usernameField: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    flexDirection: 'row',
    gap: 10,
    minHeight: 60,
  },
  input: {
    flex: 1,
    fontFamily: 'YoungSerif_400Regular',
    fontSize: 24,
    minHeight: 56,
    borderBottomWidth: 1.5,
  },
  inputBox: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1.5,
    borderRadius: 0,
    fontFamily: 'SchibstedGrotesk_400Regular',
    fontSize: 16,
    minHeight: 54,
    paddingHorizontal: 15,
  },
  avatarArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  avatarPreview: { height: 110, width: 110 },
  skipLink: { alignSelf: 'center', padding: 8 },
  finishIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  finishCard: { alignItems: 'center', gap: 5, padding: spacing.lg },
});
