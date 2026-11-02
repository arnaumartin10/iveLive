import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  MessageCircle,
  UserCheck,
  UserPlus,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { spacing } from '../theme/tokens';
import { formatRelativeDate } from '../lib/utils';
import { useMarkRead, useNotifications } from '../features/social/hooks';
import type { NotificationItem } from '../features/social/types';
import { Avatar } from '../components/ui/Avatar';
import { Text } from '../components/ui/Text';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: notifications, isLoading, refetch } = useNotifications();
  const markReadMutation = useMarkRead();

  useEffect(() => {
    // Automatically mark all read when viewing screen
    markReadMutation.mutate(undefined);
  }, [markReadMutation]);

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart size={16} color={colors.danger} fill={colors.danger} />;
      case 'comment':
        return <MessageCircle size={16} color={colors.accent} />;
      case 'new_follower':
        return <UserPlus size={16} color={colors.accent} />;
      case 'follow_request':
        return <UserCheck size={16} color={colors.warning} />;
      case 'follow_accepted':
        return <CheckCircle2 size={16} color={colors.positive} />;
      default:
        return null;
    }
  };

  const getNotificationMessage = (item: NotificationItem) => {
    switch (item.type) {
      case 'like':
        return 'liked your concert log';
      case 'comment':
        return 'commented on your concert log';
      case 'new_follower':
        return 'started following you';
      case 'follow_request':
        return 'requested to follow you';
      case 'follow_accepted':
        return 'accepted your follow request';
      default:
        return 'interacted with you';
    }
  };

  const handlePressItem = (item: NotificationItem) => {
    router.push({
      pathname: '/user/[username]',
      params: {
        username: item.actor_username,
        tab: item.log_id ? 'diary' : 'profile',
        ...(item.log_id ? { highlight: item.log_id } : {}),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing[2],
            borderBottomColor: colors.line,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <Text variant="title" weight="bold" style={styles.headerTitle}>
          Notifications
        </Text>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : !notifications || notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text variant="body" style={{ color: colors.inkMuted }}>
            No notifications yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const actorName =
              item.actor_display_name || item.actor_username || 'Someone';

            return (
              <Pressable
                onPress={() => handlePressItem(item)}
                style={[
                  styles.notificationRow,
                  {
                    backgroundColor: item.read
                      ? 'transparent'
                      : `${colors.accent}0D`,
                    borderBottomColor: colors.line,
                  },
                ]}
              >
                <View style={styles.avatarWrapper}>
                  <Avatar
                    imageUrl={item.actor_avatar_url}
                    name={actorName}
                    size="md"
                  />
                  <View
                    style={[
                      styles.iconBadge,
                      {
                        backgroundColor: colors.surfaceRaised,
                        borderColor: colors.line,
                      },
                    ]}
                  >
                    {getNotificationIcon(item.type)}
                  </View>
                </View>

                <View style={styles.contentWrap}>
                  <Text variant="body" style={{ color: colors.ink }}>
                    <Text variant="body" weight="bold">
                      {actorName}{' '}
                    </Text>
                    {getNotificationMessage(item)}
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: colors.inkMuted, marginTop: 2 }}
                  >
                    {formatRelativeDate(item.created_at)}
                  </Text>
                </View>

                {!item.read ? (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: colors.accent },
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: spacing[1],
  },
  headerTitle: {
    flex: 1,
    marginLeft: spacing[3],
  },
  headerRightSpacer: {
    width: 24,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: spacing[8],
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrapper: {
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    marginLeft: spacing[3],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing[2],
  },
});
