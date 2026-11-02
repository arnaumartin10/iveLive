import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { Ban, Flag, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import { useBlockUser, useSubmitReport } from '../../features/social/hooks';
import type { FeedItem } from '../../features/social/types';
import { Text } from '../ui/Text';

type PostOptionsModalProps = {
  item: FeedItem | null;
  visible: boolean;
  onDismiss: () => void;
};

export function PostOptionsModal({ item, visible, onDismiss }: PostOptionsModalProps) {
  const { colors } = useTheme();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const blockUserMutation = useBlockUser();
  const submitReportMutation = useSubmitReport();

  useEffect(() => {
    if (visible && item) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, item]);

  const handleReport = () => {
    if (!item) return;
    bottomSheetModalRef.current?.dismiss();
    onDismiss();

    Alert.alert('Report Concert Post', 'Why are you reporting this log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Inappropriate Content',
        style: 'destructive',
        onPress: () => {
          submitReportMutation.mutate({
            reportedUser: item.user_id,
            reportedLog: item.id,
            reason: 'inappropriate_content',
          });
          Alert.alert('Report Submitted', 'Thank you. We will review this post.');
        },
      },
      {
        text: 'Spam or Misleading',
        onPress: () => {
          submitReportMutation.mutate({
            reportedUser: item.user_id,
            reportedLog: item.id,
            reason: 'spam',
          });
          Alert.alert('Report Submitted', 'Thank you. We will review this post.');
        },
      },
    ]);
  };

  const handleBlock = () => {
    if (!item) return;
    const authorName = item.author.display_name || item.author.username || 'this user';
    Alert.alert(
      `Block @${item.author.username}?`,
      `You will no longer see posts from ${authorName}, and they won't be able to see your posts or follow you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            blockUserMutation.mutate(item.user_id);
            bottomSheetModalRef.current?.dismiss();
            onDismiss();
          },
        },
      ],
    );
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['32%']}
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
            Post Options
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close post options"
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

        <View style={styles.optionsList}>
          <Pressable
            accessibilityRole="button"
            onPress={handleReport}
            style={[styles.optionRow, { borderBottomColor: colors.line }]}
          >
            <Flag size={20} color={colors.danger} />
            <Text
              variant="body"
              weight="semibold"
              style={[styles.optionText, { color: colors.danger }]}
            >
              Report Post
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleBlock}
            style={styles.optionRow}
          >
            <Ban size={20} color={colors.danger} />
            <Text
              variant="body"
              weight="semibold"
              style={[styles.optionText, { color: colors.danger }]}
            >
              Block @{item?.author.username}
            </Text>
          </Pressable>
        </View>
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
  optionsList: {
    paddingHorizontal: spacing[4],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    marginLeft: spacing[3],
  },
});
