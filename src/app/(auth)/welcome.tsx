import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
  isAvailableAsync as isAppleAuthenticationAvailableAsync,
} from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Link, router, type Href } from 'expo-router';
import { Mail } from 'lucide-react-native';
import {
  useWindowDimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot, Wordmark } from '../../components/brand';
import { GenreLabel, Grain } from '../../components/paper';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { MACRO_GENRES } from '../../features/genres/macroGenres';
import type { MacroGenre } from '../../features/genres/macroGenres';
import {
  sendEmailOtp,
  signInWithApple,
  signInWithGoogle,
  verifyEmailOtp,
} from '../../features/auth/oauth';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

const introStorageKey = 'welcome-poster-intro-seen';
const genreCycle: MacroGenre[] = [
  'rock',
  'indie',
  'electronic',
  'latin',
  'hip_hop',
  'punk',
  'pop',
  'jazz_blues',
];

const AnimatedView = Animated.createAnimatedComponent(View);

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [genreIndex, setGenreIndex] = useState(0);
  const [captionIsLive, setCaptionIsLive] = useState(false);
  const introScale = useSharedValue(1);
  const introOpacity = useSharedValue(1);
  const genre = genreCycle[genreIndex] ?? 'rock';
  const mascotSize = Math.round(
    Math.min(width - 52, Math.max(220, height * 0.4)),
  );
  const caption = `THIS WEEK: ${MACRO_GENRES[genre].label.toUpperCase()}`;

  const introStyle = useAnimatedStyle(() => ({
    opacity: introOpacity.value,
    transform: [{ scale: introScale.value }],
  }));

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void isAppleAuthenticationAvailableAsync()
      .then((available) => {
        if (active) setAppleAvailable(available);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setNotice(
          cause instanceof Error
            ? cause.message
            : 'Could not check Apple sign-in availability.',
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => {
      setGenreIndex((index) => (index + 1) % genreCycle.length);
      setCaptionIsLive(false);
    }, 2400);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    let active = true;
    AsyncStorage.getItem(introStorageKey)
      .then((seen) => {
        if (!active || seen) return;
        introScale.value = 0.72;
        introOpacity.value = 0;
        introScale.value = withTiming(1, { duration: 1200 });
        introOpacity.value = withTiming(1, { duration: 1200 });
        return AsyncStorage.setItem(introStorageKey, 'true');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setNotice(
          cause instanceof Error
            ? cause.message
            : 'Could not load the welcome animation preference.',
        );
      });

    return () => {
      active = false;
    };
  }, [introOpacity, introScale, reduceMotion]);

  async function handleEmail() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendEmailOtp(email.trim());
      setEmailSent(true);
      setNotice('Check your inbox for a sign-in link or 6-digit code.');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not send the email.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCode() {
    setBusy(true);
    setError('');
    try {
      await verifyEmailOtp(email.trim(), code.trim());
      router.replace('/(tabs)');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'That code could not be verified.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function runProvider(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Sign in could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  }

  function showNextColorway() {
    setGenreIndex((index) => (index + 1) % genreCycle.length);
    setCaptionIsLive(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      (cause: unknown) => {
        setNotice(
          cause instanceof Error
            ? cause.message
            : 'The mascot tap feedback is unavailable.',
        );
      },
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Grain />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.frame,
          {
            borderColor: colors.ink,
            marginHorizontal: width < 380 ? 9 : 14,
            marginVertical: 8,
          },
        ]}
      >
        <View
          style={[
            styles.frameTick,
            styles.tickTop,
            { backgroundColor: colors.ink },
          ]}
        />
        <View
          style={[
            styles.frameTick,
            styles.tickBottom,
            { backgroundColor: colors.ink },
          ]}
        />
      </View>

      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          { minHeight: height - 20, paddingHorizontal: width < 380 ? 20 : 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masthead}>
          <Wordmark height={27} />
          <Text variant="mono" style={{ color: colors.inkMuted }}>
            LIVE MUSIC ARCHIVE
          </Text>
        </View>

        <View style={styles.hero}>
          <AnimatedView style={[styles.mascotMotion, introStyle]}>
            <Pressable
              accessibilityLabel={`Change mascot colorway. ${caption}`}
              accessibilityRole="button"
              onPress={showNextColorway}
              style={styles.mascotButton}
            >
              <Mascot
                animated={!reduceMotion}
                genre={genre}
                id="welcome-mascot"
                size={mascotSize}
                variant="sticker"
              />
            </Pressable>
          </AnimatedView>
          <View
            accessibilityLiveRegion={captionIsLive ? 'polite' : 'none'}
            style={styles.caption}
          >
            <GenreLabel
              genre={genre}
              label={caption}
              size="sm"
              accessibilityLiveRegion={captionIsLive ? 'polite' : 'none'}
            />
          </View>
          <Text
            variant="headline"
            center
            style={[styles.tagline, { color: colors.ink }]}
          >
            Every show you’ve ever been to.
          </Text>
          <View style={[styles.admission, { borderColor: colors.ink }]}>
            <Text variant="mono" style={{ color: colors.ink }}>
              ADMIT ONE · EST. 2026
            </Text>
            <Text variant="mono" style={{ color: colors.inkMuted }}>
              ✦
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.authPanel,
            { backgroundColor: colors.surface, borderColor: colors.ink },
          ]}
        >
          <Text
            variant="label"
            style={[styles.sectionLabel, { color: colors.ink }]}
          >
            {emailSent ? 'CHECK YOUR EMAIL' : 'KEEP EVERY NIGHT'}
          </Text>

          {emailSent ? (
            <>
              <Text variant="caption" color="secondary">
                We sent a sign-in email to {email.trim()}. Open its link to sign
                in, or enter the 6-digit code below.
              </Text>
              <TextInput
                accessibilityLabel="Email sign-in code"
                autoComplete="one-time-code"
                autoCorrect={false}
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={setCode}
                placeholder="Enter the 6-digit code"
                placeholderTextColor={colors.inkMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.ink,
                    color: colors.ink,
                  },
                ]}
                value={code}
              />
              <Button
                label="Sign in with code"
                loading={busy}
                onPress={handleCode}
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={handleEmail}
                style={styles.backLink}
              >
                <Text variant="caption" color="secondary">
                  Resend sign-in email
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setEmailSent(false)}
                style={styles.backLink}
              >
                <Text variant="caption" color="secondary">
                  Use a different email
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                accessibilityLabel="Email address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Your email address"
                placeholderTextColor={colors.inkMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.ink,
                    color: colors.ink,
                  },
                ]}
                value={email}
              />
              <Button
                label="Continue with email"
                leftIcon={<Mail color={colors.accentInk} size={17} />}
                loading={busy}
                onPress={handleEmail}
              />
              <View style={styles.separator}>
                <View
                  style={[
                    styles.separatorLine,
                    { backgroundColor: colors.line },
                  ]}
                />
                <Text variant="overline" color="muted">
                  OR
                </Text>
                <View
                  style={[
                    styles.separatorLine,
                    { backgroundColor: colors.line },
                  ]}
                />
              </View>
              <Button
                variant="secondary"
                label="Continue with Google"
                loading={busy}
                onPress={() => runProvider(signInWithGoogle)}
              />
              <Text variant="caption" color="secondary">
                Google signs you in directly; it does not send a separate email
                link.
              </Text>
              {appleAvailable ? (
                <AppleAuthenticationButton
                  buttonStyle={AppleAuthenticationButtonStyle.WHITE}
                  buttonType={AppleAuthenticationButtonType.CONTINUE}
                  cornerRadius={4}
                  onPress={() => void runProvider(signInWithApple)}
                  style={styles.appleButton}
                />
              ) : null}
            </>
          )}

          {notice ? (
            <Text variant="caption" color="secondary">
              {notice}
            </Text>
          ) : null}
          {error ? (
            <Text variant="caption" color="danger">
              {error}
            </Text>
          ) : null}
          <View style={styles.legalLinks}>
            <Link href={'/legal/terms' as Href} asChild>
              <Pressable accessibilityRole="link">
                <Text variant="caption" style={{ color: colors.accent }}>
                  Terms
                </Text>
              </Pressable>
            </Link>
            <Text variant="mono" style={{ color: colors.inkMuted }}>
              ·
            </Text>
            <Link href={'/legal/privacy' as Href} asChild>
              <Pressable accessibilityRole="link">
                <Text variant="caption" style={{ color: colors.accent }}>
                  Privacy
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: 10,
  },
  frame: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    pointerEvents: 'none',
  },
  frameTick: { height: 1, position: 'absolute', width: 18 },
  tickTop: { left: '50%', top: -1 },
  tickBottom: { bottom: -1, left: '50%' },
  masthead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 34,
  },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  mascotMotion: { alignItems: 'center', justifyContent: 'center' },
  mascotButton: { alignItems: 'center', justifyContent: 'center' },
  caption: { letterSpacing: 1.1, paddingTop: 1 },
  tagline: { fontSize: 28, lineHeight: 34, maxWidth: 340 },
  admission: {
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  authPanel: {
    borderWidth: 1.5,
    borderRadius: 0,
    gap: 10,
    padding: 14,
  },
  sectionLabel: { letterSpacing: 1.1, textAlign: 'center' },
  input: {
    borderBottomWidth: 1.5,
    borderRadius: 0,
    fontFamily: 'SchibstedGrotesk_400Regular',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  separator: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth },
  appleButton: { height: 48, width: '100%' },
  backLink: { alignSelf: 'center', padding: 4 },
  legalLinks: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingTop: 2,
  },
});
