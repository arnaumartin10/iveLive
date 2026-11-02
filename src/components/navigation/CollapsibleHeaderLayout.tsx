import React, { type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { useMe } from '../../features/auth/hooks';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';

type CollapsibleHeaderLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightAction?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function CollapsibleHeaderLayout({
  title,
  subtitle,
  children,
  rightAction,
  onRefresh,
  refreshing = false,
}: CollapsibleHeaderLayoutProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const profileQuery = useMe();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerBarBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [10, 48],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const compactTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [24, 52],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [24, 52],
      [8, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const largeTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 50],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 50],
      [0, -8],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const profile = profileQuery.data;
  const avatarName = profile?.display_name || profile?.username || 'You';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.headerBar,
          {
            height: insets.top + 52,
            paddingTop: insets.top,
          },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, headerBarBgStyle]}
          pointerEvents="none"
        >
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.bg,
                borderBottomColor: colors.line,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          />
        </Animated.View>

        <View style={styles.headerBarInner}>
          <View style={styles.headerLeftSpacer} />

          {/* Compact Title (Collapses in on scroll) */}
          <Animated.View style={[styles.compactTitleWrap, compactTitleStyle]}>
            <Text
              variant="label"
              weight="bold"
              numberOfLines={1}
              style={styles.compactTitleText}
            >
              {title}
            </Text>
          </Animated.View>

          {/* Top-Right Profile Avatar */}
          <View style={styles.headerRightAction}>
            {rightAction ? (
              rightAction
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open your profile"
                onPress={() => router.push('/user/me')}
                style={styles.avatarButton}
              >
                <Avatar
                  imageUrl={profile?.avatar_url}
                  name={avatarName}
                  size="sm"
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Main Content with Large Title */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 58,
            paddingBottom: 110 + insets.bottom,
          },
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressViewOffset={insets.top + 40}
            />
          ) : undefined
        }
      >
        {/* Large Collapsing Title Section */}
        <Animated.View style={[styles.largeTitleBlock, largeTitleStyle]}>
          <Text variant="display" weight="black" style={styles.largeTitleText}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              variant="caption"
              color="secondary"
              style={styles.subtitleText}
            >
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>

        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  headerBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeftSpacer: {
    width: 36,
  },
  compactTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitleText: {
    fontSize: 16,
  },
  headerRightAction: {
    width: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  avatarButton: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: 16,
    minHeight: '100%',
  },
  largeTitleBlock: {
    marginBottom: 20,
    marginTop: 6,
  },
  largeTitleText: {
    letterSpacing: -0.8,
  },
  subtitleText: {
    marginTop: 4,
    fontSize: 13,
  },
});
