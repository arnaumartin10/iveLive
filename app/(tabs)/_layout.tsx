import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { palette, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';

interface TabIconProps {
  label: string;
  icon: string;
  focused: boolean;
}

function TabItem({ label, icon, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Text
        variant="title"
        color={focused ? 'crimson' : 'muted'}
        style={styles.iconSymbol}
      >
        {icon}
      </Text>
      <Text
        variant="overline"
        color={focused ? 'primary' : 'muted'}
        weight={focused ? 'bold' : 'medium'}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const handleLogPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/log');
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenListeners={{
          tabPress: () => {
            void Haptics.selectionAsync();
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabButton,
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Archive',
            tabBarAccessibilityLabel: 'Artist Archive Tab',
            tabBarIcon: ({ focused }) => (
              <TabItem label="Archive" icon="◎" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="timeline"
          options={{
            title: 'Timeline',
            tabBarAccessibilityLabel: 'Concert Timeline Tab',
            tabBarIcon: ({ focused }) => (
              <TabItem label="Timeline" icon="☰" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarAccessibilityLabel: 'Concert Stats Tab',
            tabBarIcon: ({ focused }) => (
              <TabItem label="Stats" icon="▲" focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarAccessibilityLabel: 'User Profile Tab',
            tabBarIcon: ({ focused }) => (
              <TabItem label="Profile" icon="●" focused={focused} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Center Log Action Button */}
      <Pressable
        onPress={handleLogPress}
        style={styles.floatingButton}
        accessibilityRole="button"
        accessibilityLabel="Log a new concert"
      >
        <View style={styles.floatingButtonInner}>
          <Text variant="title" weight="black" color="inverse">
            +
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface0,
  },
  tabBar: {
    backgroundColor: palette.surface1,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: spacing[2],
    paddingTop: spacing[1],
  },
  tabButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSymbol: {
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 2,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    zIndex: 99,
    shadowColor: palette.crimson,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.crimson,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.surface0,
  },
});
