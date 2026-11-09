/**
 * PAPER & INK — Custom Tab Bar
 *
 * Physical printed ticket bar: solid paper surface, 1.5px ink rule on top,
 * stamped center FAB with hard offset shadow, NO blur/glassmorphism, NO gradients.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { routes } from '../../navigation/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  BarChart3,
  CalendarDays,
  Orbit,
  Plus,
  UserCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { hardShadow, spring } from '../../theme/tokens';
import { Text } from '../ui/Text';

type TabRoute = {
  key: string;
  name: string;
  params?: object;
};

export type CustomTabBarProps = {
  state: any;
  descriptors: Record<string, any>;
  navigation: any;
};

type TabConfig = {
  name: string;
  label: string;
  icon: LucideIcon;
};

const TAB_CONFIGS: Record<string, TabConfig> = {
  index: {
    name: 'index',
    label: 'Home',
    icon: CalendarDays,
  },
  cloud: {
    name: 'cloud',
    label: 'Cloud',
    icon: Orbit,
  },
  stats: {
    name: 'stats',
    label: 'Stats',
    icon: BarChart3,
  },
  profile: {
    name: 'profile',
    label: 'Profile',
    icon: UserCheck,
  },
};

type TabItemProps = {
  isFocused: boolean;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({
  isFocused,
  label,
  icon: Icon,
  onPress,
  onLongPress,
}: TabItemProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={onLongPress}
      style={[
        styles.tabButton,
        isFocused && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
      ]}
    >
      <View style={styles.iconWrap}>
        <Icon
          size={22}
          color={isFocused ? colors.accent : colors.inkMuted}
          strokeWidth={isFocused ? 2.5 : 2}
        />
      </View>
      <Text
        variant="label"
        style={[
          styles.tabLabel,
          {
            color: isFocused ? colors.accent : colors.inkMuted,
            fontWeight: isFocused ? '700' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CenterPlusButton() {
  const { colors } = useTheme();
  const fabScale = useSharedValue(1.0);
  const fabRotate = useSharedValue(0);

  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${fabRotate.value - 4}deg` },
    ],
  }));

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    fabScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1.0, spring.stamp),
    );
    fabRotate.value = withSequence(
      withTiming(2, { duration: 60 }),
      withSpring(0, spring.snappy),
    );
    router.navigate(routes.logWizard());
  };

  return (
    <View style={styles.centerButtonContainer} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a concert"
        accessibilityHint="Opens the concert logging modal."
        onPress={handlePress}
        style={styles.fabPressable}
      >
        <Animated.View
          style={[
            styles.fabCircle,
            hardShadow.md,
            {
              backgroundColor: colors.accent,
              borderColor: colors.ink,
            },
            animatedFabStyle,
          ]}
        >
          <Plus color={colors.accentInk} size={28} strokeWidth={2.8} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: CustomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route: TabRoute) => {
    const { options } = descriptors[route.key] ?? {};
    if (options?.href === null) return false;
    if (
      route.name === 'settings' ||
      route.name === 'log' ||
      route.name === 'archive' ||
      route.name === 'friends' ||
      route.name === 'timeline'
    )
      return false;
    return !!TAB_CONFIGS[route.name];
  });

  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2, 4);

  const renderTab = (route: (typeof visibleRoutes)[number]) => {
    const isFocused = state.routes[state.index]?.key === route.key;
    const config = TAB_CONFIGS[route.name] || {
      name: route.name,
      label: route.name,
      icon: CalendarDays,
    };

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (event.defaultPrevented) return;

      if (isFocused) {
        const nestedState = route.state;
        if (
          nestedState?.type === 'stack' &&
          nestedState.index > 0 &&
          nestedState.key
        ) {
          navigation.dispatch({
            type: 'POP_TO_TOP',
            target: nestedState.key,
          });
        }
      } else {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    return (
      <TabItem
        key={route.key}
        isFocused={isFocused}
        label={config.label}
        icon={config.icon}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );
  };

  const bottomPadding = Math.max(insets.bottom, 10);
  const barHeight = 56 + bottomPadding;

  return (
    <View
      style={[styles.wrapper, { height: barHeight }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.backgroundContainer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.ink,
            borderStyle: 'dashed',
          },
        ]}
        pointerEvents="none"
      />

      <View
        style={[
          styles.tabsRow,
          {
            paddingBottom: bottomPadding,
          },
        ]}
      >
        <View style={styles.groupSide}>{leftRoutes.map(renderTab)}</View>

        <CenterPlusButton />

        <View style={styles.groupSide}>{rightRoutes.map(renderTab)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
    zIndex: 100,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1.5,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  groupSide: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 54,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  tabLabel: {
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    zIndex: 110,
  },
  fabPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  fabCircle: {
    width: 54,
    height: 54,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
