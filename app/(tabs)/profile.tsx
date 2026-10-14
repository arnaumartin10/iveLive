import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import { palette, spacing } from '@theme/tokens';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { ShareCard } from '@components/social/ShareCard';
import { OfflineNotice } from '@components/ui/OfflineNotice';
import { useAuthStore } from '@features/auth/store';
import { useUserConcerts } from '@features/concerts/hooks';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const userId = user?.id ?? 'demo-user-id';
  const username = user?.email?.split('@')[0] ?? 'music_lover';

  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  const { data: concerts = [] } = useUserConcerts(userId);

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `I've logged ${concerts.length} concerts on IveLive! Track every artist you see live: https://ivelive.app/@${username}`,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleSignOut = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Sign Out', 'Are you sure you want to sign out of IveLive?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const toggleOfflineSimulation = async () => {
    await Haptics.selectionAsync();
    setIsSimulatedOffline((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OfflineNotice isOffline={isSimulatedOffline} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="overline" color="steel" weight="bold">
            PROFILE
          </Text>
          <Text variant="headline" weight="black">
            @{username}
          </Text>
          <Text variant="body" color="secondary" style={styles.bio}>
            Live-music archivist. Collecting every artist seen in person.
          </Text>
        </View>

        {/* Shareable visual card */}
        <View style={styles.section}>
          <Text variant="title" weight="bold" style={styles.sectionTitle}>
            Your Live Archive Card
          </Text>
          <ShareCard username={username} concerts={concerts} />
          <Button
            label="Share Archive Card"
            variant="secondary"
            size="md"
            onPress={handleShare}
            style={styles.shareButton}
          />
        </View>

        {/* App Settings & Status */}
        <View style={styles.section}>
          <Text variant="title" weight="bold" style={styles.sectionTitle}>
            Preferences & Status
          </Text>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View>
                <Text variant="base" weight="semibold">
                  Offline Mode Simulation
                </Text>
                <Text variant="caption" color="secondary">
                  Test cached offline state handling
                </Text>
              </View>
              <Button
                label={isSimulatedOffline ? 'Online' : 'Go Offline'}
                variant={isSimulatedOffline ? 'danger' : 'secondary'}
                size="sm"
                onPress={toggleOfflineSimulation}
              />
            </View>
          </Card>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View>
                <Text variant="base" weight="semibold">
                  Color Scheme
                </Text>
                <Text variant="caption" color="secondary">
                  Dark-first (Navy & Crimson)
                </Text>
              </View>
              <View style={styles.paletteDots}>
                <View style={[styles.dot, { backgroundColor: palette.crimson }]} />
                <View style={[styles.dot, { backgroundColor: palette.navy }]} />
                <View style={[styles.dot, { backgroundColor: palette.amber }]} />
                <View style={[styles.dot, { backgroundColor: palette.steel }]} />
                <View style={[styles.dot, { backgroundColor: palette.ivory }]} />
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.signOutSection}>
          <Button
            label="Sign Out"
            variant="ghost"
            size="md"
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surface0,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[16],
  },
  header: {
    marginBottom: spacing[6],
  },
  bio: {
    marginTop: spacing[2],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  shareButton: {
    marginTop: spacing[3],
  },
  settingCard: {
    marginBottom: spacing[3],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paletteDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.border,
  },
  signOutSection: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
});
