import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { Flag, Send, Trash2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing } from '../../theme/tokens';
import { formatRelativeDate } from '../../lib/utils';
import { useAuthStore } from '../../features/auth/store';
import {
  useComments,
  useDeleteComment,
  usePostComment,
  useSubmitReport,
} from '../../features/social/hooks';
import type { Comment } from '../../features/social/types';
import { Avatar } from '../ui/Avatar';
import { Text } from '../ui/Text';

type CommentsSheetProps = {
  logId: string | null;
  visible: boolean;
  onDismiss: () => void;
};

export function CommentsSheet({ logId, visible, onDismiss }: CommentsSheetProps) {
  const { colors } = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [inputText, setInputText] = useState('');

  const commentsQuery = useComments(logId ?? '');
  const postCommentMutation = usePostComment(logId ?? '');
  const deleteCommentMutation = useDeleteComment(logId ?? '');
  const submitReportMutation = useSubmitReport();

  useEffect(() => {
    if (visible && logId) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, logId]);

  const comments = commentsQuery.data ?? [];

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !logId) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    postCommentMutation.mutate(trimmed, {
      onError: (err: any) => {
        Alert.alert('Could not post comment', err?.message ?? 'Please try again later.');
      },
    });
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('Delete comment', 'Are you sure you want to remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          deleteCommentMutation.mutate(commentId);
        },
      },
    ]);
  };

  const handleReport = (comment: Comment) => {
    Alert.alert('Report Comment', 'Why are you reporting this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Spam or Offensive',
        style: 'destructive',
        onPress: () => {
          submitReportMutation.mutate({
            reportedUser: comment.user_id,
            reason: 'offensive_comment',
            details: comment.body,
          });
          Alert.alert('Thank you', 'Your report has been submitted.');
        },
      },
    ]);
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={['70%', '94%']}
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Text variant="title" weight="bold">
            Comments {comments.length > 0 ? `(${comments.length})` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close comments"
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

        {/* Comment List */}
        <View style={styles.listContainer}>
          <FlashList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text
                  variant="body"
                  style={[styles.emptyText, { color: colors.inkMuted }]}
                >
                  {commentsQuery.isLoading
                    ? 'Loading comments...'
                    : 'No comments yet. Start the conversation!'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMine = item.user_id === currentUserId;
              const authorName = item.author?.display_name || item.author?.username || 'User';

              return (
                <View style={styles.commentRow}>
                  <Avatar
                    imageUrl={item.author?.avatar_url}
                    name={authorName}
                    size="sm"
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentMetaRow}>
                      <Text variant="label" weight="semibold">
                        {authorName}
                      </Text>
                      <Text
                        variant="caption"
                        style={{ color: colors.inkMuted, marginLeft: spacing[2] }}
                      >
                        {formatRelativeDate(item.created_at)}
                      </Text>
                    </View>
                    <Text
                      variant="body"
                      style={[styles.commentBody, { color: colors.ink }]}
                    >
                      {item.body}
                    </Text>
                  </View>

                  {/* Actions: Delete or Report */}
                  <View style={styles.commentActions}>
                    {isMine ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete comment"
                        onPress={() => handleDelete(item.id)}
                        hitSlop={6}
                        style={styles.iconAction}
                      >
                        <Trash2 size={16} color={colors.inkMuted} />
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Report comment"
                        onPress={() => handleReport(item)}
                        hitSlop={6}
                        style={styles.iconAction}
                      >
                        <Flag size={15} color={colors.inkMuted} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>

        {/* Pinned Composer */}
        <View
          style={[
            styles.composerBar,
            {
              backgroundColor: colors.surfaceRaised,
              borderTopColor: colors.line,
            },
          ]}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Add a comment..."
            placeholderTextColor={colors.inkMuted}
            multiline
            maxLength={500}
            style={[
              styles.input,
              {
                color: colors.ink,
                backgroundColor: colors.surface,
                borderColor: colors.line,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send comment"
            disabled={!inputText.trim() || postCommentMutation.isPending}
            onPress={handleSend}
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.accent : colors.line,
                opacity: inputText.trim() ? 1 : 0.5,
              },
            ]}
          >
            <Send size={16} color={colors.accentInk} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  emptyContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: spacing[3],
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing[2],
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentBody: {
    marginTop: 2,
    lineHeight: 19,
  },
  commentActions: {
    marginLeft: spacing[2],
    justifyContent: 'center',
  },
  iconAction: {
    padding: spacing[1],
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    fontSize: 15,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
  },
});
