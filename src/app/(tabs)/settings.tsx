import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  LogOut,
  MapPin,
  ShieldCheck,
  Trash2,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Wordmark } from '../../components/brand/Wordmark';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Sheet } from '../../components/ui/Sheet';
import { Text } from '../../components/ui/Text';
import {
  useMe,
  useUpdatePrivacy,
  useUpdateProfile,
} from '../../features/auth/hooks';
import { useAuthStore } from '../../features/auth/store';
import { clearSessionData } from '../../navigation/clearSessionData';
import { routes } from '../../navigation/routes';
import { useSafeBack } from '../../navigation/useSafeBack';
import { LocationPreferenceSheet } from '../../features/home/LocationPreferenceSheet';
import { useHomeLocation } from '../../features/home/useHomeLocation';
import { countryNameFromCode } from '../../features/home/location';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeMode } from '../../theme/store';
import { fontFamily, radius, spacing } from '../../theme/tokens';
import { cloudExperiencePreferences } from '../../features/cloud/experiencePrefs';
import type { CloudQualitySetting } from '../../features/cloud/performance';

const appearanceOptions: { label: string; value: ThemeMode }[] = [
  { label: 'Bright', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const cloudQualityOptions = [
  { label: 'Auto', value: 'auto' },
  { label: 'Spectacular', value: 'spectacular' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Lite', value: 'lite' },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const safeBack = useSafeBack(routes.fallback.settings());
  const user = useAuthStore((state) => state.user);
  const profileQuery = useMe();
  const updateProfile = useUpdateProfile(user?.id ?? '');
  const updatePrivacy = useUpdatePrivacy(user?.id ?? '');
  const {
    location,
    isLoading: isLocationLoading,
    error: locationError,
  } = useHomeLocation();
  const [displayName, setDisplayName] = useState(
    () => profileQuery.data?.display_name ?? '',
  );
  const [bio, setBio] = useState(() => profileQuery.data?.bio ?? '');
  const [username, setUsername] = useState(
    () => profileQuery.data?.username ?? '',
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    () => profileQuery.data?.avatar_url ?? null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [motionEffects, setMotionEffects] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [cloudQuality, setCloudQuality] = useState<CloudQualitySetting>('auto');

  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet([
      cloudExperiencePreferences.motionEffects,
      cloudExperiencePreferences.soundEnabled,
      cloudExperiencePreferences.quality,
    ])
      .then((values) => {
        if (!active) return;
        setMotionEffects(values[0]?.[1] === 'true');
        setSoundEnabled(values[1]?.[1] === 'true');
        const quality = values[2]?.[1];
        if (
          quality === 'auto' ||
          quality === 'spectacular' ||
          quality === 'balanced' ||
          quality === 'lite'
        ) {
          setCloudQuality(quality);
        }
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not load Cloud preferences.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveCloudPreference(
    key: string,
    value: boolean,
    update: (next: boolean) => void,
  ) {
    try {
      await AsyncStorage.setItem(key, String(value));
      update(value);
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save this preference.',
      );
    }
  }

  async function saveCloudQuality(value: string) {
    if (
      value !== 'auto' &&
      value !== 'spectacular' &&
      value !== 'balanced' &&
      value !== 'lite'
    ) {
      setMessage('Choose a valid Cloud quality.');
      return;
    }
    try {
      await AsyncStorage.setItem(cloudExperiencePreferences.quality, value);
      setCloudQuality(value);
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not save Cloud quality.',
      );
    }
  }

  async function saveProfile() {
    if (!user) return;
    setBusy(true);
    setMessage('');
    try {
      await updateProfile.mutateAsync({
        username: username.trim(),
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
      });
      setMessage('Profile saved.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not save your profile.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function pickAndUploadAvatar() {
    if (!user) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) return;
      setAvatarPreview(asset.uri);

      const cropSize = Math.min(asset.width, asset.height);
      const resized = await ImageManipulator.manipulateAsync(
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
      const response = await fetch(resized.uri);
      const imageData = await response.arrayBuffer();
      const path = `${user.id}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, imageData, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      setAvatarPreview(resized.uri);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not upload the photo.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setMessage(error.message);
        return;
      }
      try {
        await clearSessionData();
      } catch (cleanupError) {
        console.error(
          '[auth] Could not clear all local session data.',
          cleanupError,
        );
        setMessage(
          'You are signed out, but some local media could not be cleared.',
        );
      }
      router.replace(routes.welcome());
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirmation !== 'DELETE') return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { confirmation: 'DELETE' },
      });
      if (error) throw error;
      await supabase.auth.signOut({ scope: 'local' });
      try {
        await clearSessionData();
      } catch (cleanupError) {
        console.error(
          '[auth] Could not clear all local session data.',
          cleanupError,
        );
        setMessage(
          'Your account was deleted, but some local media could not be cleared.',
        );
      }
      setDeleteVisible(false);
      router.replace(routes.welcome());
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not delete your account.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (profileQuery.isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to profile"
            onPress={safeBack}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color={colors.ink} />
          </Pressable>
          <Wordmark height={22} />
          <Text variant="display">Settings</Text>
          <Text variant="body" color="secondary">
            Make IveLive yours.
          </Text>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.avatarRow}>
            {avatarPreview || avatarUrl ? (
              <Image
                source={{ uri: avatarPreview ?? avatarUrl ?? undefined }}
                contentFit="cover"
                style={styles.avatar}
              />
            ) : (
              <Avatar
                fallbackGenre="unclassified"
                name={displayName || username}
                size="lg"
              />
            )}
            <View style={styles.profileHeading}>
              <Text variant="title">Your profile</Text>
              <Text variant="caption" color="secondary">
                @{profileQuery.data?.username}
              </Text>
            </View>
            <Button
              accessibilityLabel="Change avatar"
              label=""
              variant="secondary"
              size="sm"
              leftIcon={<Camera color={colors.ink} size={17} />}
              onPress={pickAndUploadAvatar}
            />
          </View>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            placeholder="Username"
            placeholderTextColor={colors.inkMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                color: colors.ink,
              },
            ]}
          />
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={colors.inkMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                color: colors.ink,
              },
            ]}
          />
          <TextInput
            accessibilityLabel="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={160}
            placeholder="A little about you"
            placeholderTextColor={colors.inkMuted}
            style={[
              styles.input,
              styles.bioInput,
              {
                backgroundColor: colors.bg,
                borderColor: colors.line,
                color: colors.ink,
              },
            ]}
          />
          <Button
            label="Save profile"
            loading={busy && !deleteVisible}
            onPress={saveProfile}
          />
        </Card>

        <Card style={styles.preferenceCard}>
          <View style={styles.preferenceHeading}>
            <View
              style={[
                styles.preferenceIcon,
                { backgroundColor: `${colors.accent}20` },
              ]}
            >
              <ShieldCheck color={colors.accent} size={19} />
            </View>
            <View style={styles.preferenceCopy}>
              <Text variant="label">Private account</Text>
              <Text variant="caption" color="secondary">
                Only followers can see your show logs.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Private account"
              value={profileQuery.data?.is_private ?? false}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.surface}
              disabled={updatePrivacy.isPending}
              onValueChange={(value) => {
                setMessage('');
                updatePrivacy.mutate(value, {
                  onError: (error) => setMessage(error.message),
                });
              }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <Text variant="label">Appearance</Text>
          <SegmentedControl
            options={appearanceOptions}
            value={mode}
            onChange={(value) => setMode(value as ThemeMode)}
          />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <View style={styles.locationPreference}>
            <View style={styles.preferenceCopy}>
              <Text variant="label">Tour discovery location</Text>
              <Text variant="caption" color="secondary">
                {location.city ||
                  countryNameFromCode(location.country) ||
                  'No location set'}
                {' · Stored on this device only'}
              </Text>
              {locationError ? (
                <Text variant="caption" color="danger">
                  {locationError.message}
                </Text>
              ) : null}
            </View>
            <Button
              label="Details"
              size="sm"
              variant="secondary"
              leftIcon={<MapPin color={colors.ink} size={15} />}
              onPress={() => setLocationSheetVisible(true)}
            />
          </View>
        </Card>

        <Card style={styles.preferenceCard}>
          <Text variant="label">Cloud experience</Text>
          <View style={styles.preferenceCopy}>
            <Text variant="label">Cloud quality</Text>
            <Text variant="caption" color="secondary">
              Auto starts at the tier best suited to this device and steps down
              when the atlas stays above its frame-time budget.
            </Text>
          </View>
          <SegmentedControl
            options={cloudQualityOptions}
            value={cloudQuality}
            onChange={(value) => void saveCloudQuality(value)}
          />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <View style={styles.preferenceHeading}>
            <View style={styles.preferenceCopy}>
              <Text variant="label">Motion effects</Text>
              <Text variant="caption" color="secondary">
                Tilt the atlas layers with your device. Reduced Motion always
                disables this.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Motion effects"
              value={motionEffects}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.surface}
              onValueChange={(value) =>
                void saveCloudPreference(
                  cloudExperiencePreferences.motionEffects,
                  value,
                  setMotionEffects,
                )
              }
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <View style={styles.preferenceHeading}>
            <View style={styles.preferenceCopy}>
              <Text variant="label">Sound effects</Text>
              <Text variant="caption" color="secondary">
                Optional print sounds. Playback stays silent until the sound
                assets are added.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Sound effects"
              value={soundEnabled}
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.surface}
              onValueChange={(value) =>
                void saveCloudPreference(
                  cloudExperiencePreferences.soundEnabled,
                  value,
                  setSoundEnabled,
                )
              }
            />
          </View>
        </Card>

        {message ? (
          <Text
            variant="caption"
            color={message === 'Profile saved.' ? 'success' : 'danger'}
          >
            {message}
          </Text>
        ) : null}

        <Button
          variant="secondary"
          label="Sign out"
          leftIcon={<LogOut color={colors.ink} size={17} />}
          loading={busy && !deleteVisible}
          onPress={() => void signOut()}
        />
        <Button
          variant="danger"
          label="Delete account"
          leftIcon={<Trash2 color={colors.danger} size={17} />}
          disabled={busy}
          onPress={() => setDeleteVisible(true)}
        />

        <Sheet
          title="Delete your account?"
          visible={deleteVisible}
          onDismiss={() => setDeleteVisible(false)}
          snapPoints={['42%']}
        >
          <View style={styles.deleteSheet}>
            <Text variant="body" color="secondary">
              This permanently deletes your profile, show logs, likes, comments,
              and follows. Type DELETE to confirm.
            </Text>
            <TextInput
              accessibilityLabel="Type DELETE to confirm account deletion"
              autoCapitalize="characters"
              onChangeText={setDeleteConfirmation}
              placeholder="DELETE"
              placeholderTextColor={colors.inkMuted}
              style={[
                styles.input,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.line,
                  color: colors.ink,
                },
              ]}
              value={deleteConfirmation}
            />
            <Button
              variant="danger"
              label="Delete permanently"
              loading={busy}
              disabled={deleteConfirmation !== 'DELETE'}
              onPress={deleteAccount}
            />
          </View>
        </Sheet>
        <LocationPreferenceSheet
          visible={locationSheetVisible}
          onDismiss={() => setLocationSheetVisible(false)}
          location={location}
          isLoading={isLocationLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: 18, padding: 24, paddingBottom: 40 },
  header: { gap: 6, marginBottom: 4 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  profileCard: { gap: 14 },
  avatarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 2,
  },
  avatar: { borderRadius: 999, height: 56, width: 56 },
  profileHeading: { flex: 1, gap: 3 },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  bioInput: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  preferenceCard: { gap: 15 },
  preferenceHeading: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  preferenceIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  preferenceCopy: { flex: 1, gap: 3 },
  divider: { height: StyleSheet.hairlineWidth },
  locationPreference: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteSheet: { gap: spacing.lg, paddingHorizontal: 24, paddingTop: 4 },
});
