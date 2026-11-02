import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { formatRelativeDate } from '../../lib/utils';
import {
  useAcceptFollowRequest,
  useDeclineFollowRequest,
  useFollowRequests,
} from '../../features/social/hooks';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';

type FollowRequestsModalProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function FollowRequestsModal({ visible, onDismiss }: FollowRequestsModalProps) {
  const { colors } = useTheme();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const { data: requests, isLoading } = useFollowRequests();
  const acceptMutation = useAcceptFollowRequest();
  const declineMutation = useDeclineFollowRequest();

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleAccept = (id: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptMutation.mutate(id);
  };

  const handleDecline = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    declineMutation.mutate(id);
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['55%', '85%']}
      onDismiss={onDismiss}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.line }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
          pressBehavior="close"
        />
      )}
    >
      <View style={styles.container}>
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Text variant="title" weight="bold">
            Follow Requests {requests?.length ? `(${requests.length})` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close follow requests"
            onPress={() => {
              bottomSheetModalRef.current?.dismiss();
              onDismiss();
            }}
            hitSlop={8}
            style={styles.closeBtn}
          >
            <X size={20} color={colors.inkMuted} />
          </Pressable>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : !requests || requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text
                variant="body"
                style={{ color: colors.inkMuted, textAlign: 'center' }}
              >
                No pending follow requests
              </Text>
            </View>
          ) : (
            requests.map((req) => {
              const displayName = req.display_name || req.username;
              return (
                <View
                  key={req.id}
                  style={[
                    styles.requestRow,
                    { borderBottomColor: colors.line },
                  ]}
                >
                  <Avatar
                    imageUrl={req.avatar_url}
                    name={displayName}
                    size="md"
                  />
                  <View style={styles.userInfo}>
                    <Text variant="body" weight="semibold" numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text
                      variant="caption"
                      style={{ color: colors.inkMuted }}
                    >
                      @{req.username} • {formatRelativeDate(req.requested_at)}
                    </Text>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Accept follow request"
                      onPress={() => handleAccept(req.id)}
                      style={[styles.actionBtn, { backgroundColor: colors.accent }]}
                    >
                      <Check size={16} color={colors.accentInk} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Decline follow request"
                      onPress={() => handleDecline(req.id)}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.surfaceRaised,
                          borderColor: colors.line,
                          borderWidth: 1,
                          marginLeft: spacing[2],
                        },
                      ]}
                    >
                      <X size={16} color={colors.inkMuted} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </BottomSheetScrollView>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    padding: spacing[1],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  loadingContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
