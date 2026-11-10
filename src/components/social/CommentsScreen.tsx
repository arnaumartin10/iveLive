import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Flag, Send, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
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
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { StaticPageHeader } from '../navigation/StaticPageHeader';

type Props = {
  logId: string;
  onBack: () => void;
};

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function CommentsScreen({ logId, onBack }: Props) {
  const { colors } = useTheme();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [inputText, setInputText] = useState('');
  const commentsQuery = useComments(logId);
  const postCommentMutation = usePostComment(logId);
  const deleteCommentMutation = useDeleteComment(logId);
  const submitReportMutation = useSubmitReport();
  const comments = commentsQuery.data ?? [];
  const trimmedInput = inputText.trim();

  const handleSend = () => {
    if (!trimmedInput || postCommentMutation.isPending) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    postCommentMutation.mutate(trimmedInput, {
      onSuccess: () => setInputText(''),
      onError: (error) => showMessage('Could not post comment', error.message),
    });
  };

  const handleDelete = (commentId: string) => {
    const remove = () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      deleteCommentMutation.mutate(commentId, {
        onError: (error) =>
          showMessage('Could not delete comment', error.message),
      });
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Delete this comment?')) remove();
      return;
    }
    Alert.alert(
      'Delete comment',
      'Are you sure you want to remove this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: remove },
      ],
    );
  };

  const handleReport = (comment: Comment) => {
    const report = () =>
      submitReportMutation.mutate(
        {
          reportedUser: comment.user_id,
          reason: 'offensive_comment',
          details: comment.body,
        },
        {
          onSuccess: () =>
            showMessage('Thank you', 'Your report has been submitted.'),
          onError: (error) =>
            showMessage('Could not report comment', error.message),
        },
      );
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Report this comment as spam or offensive?')) report();
      return;
    }
    Alert.alert('Report comment', 'Why are you reporting this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam or offensive', style: 'destructive', onPress: report },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StaticPageHeader
        title={`Comments${comments.length ? ` · ${comments.length}` : ''}`}
        onBack={onBack}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <FlashList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {commentsQuery.isError ? (
                <>
                  <Text variant="body" color="danger">
                    {commentsQuery.error.message}
                  </Text>
                  <Button
                    label="Try again"
                    variant="secondary"
                    onPress={() => void commentsQuery.refetch()}
                  />
                </>
              ) : (
                <Text variant="body" color="secondary">
                  {commentsQuery.isLoading
                    ? 'Loading comments…'
                    : 'No comments yet. Start the conversation!'}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.user_id === currentUserId;
            const authorName =
              item.author?.display_name || item.author?.username || 'User';
            return (
              <View
                style={[styles.commentRow, { borderBottomColor: colors.line }]}
              >
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
                      style={{
                        color: colors.inkMuted,
                        marginLeft: spacing.xs,
                      }}
                    >
                      {formatRelativeDate(item.created_at)}
                    </Text>
                  </View>
                  <Text variant="body" style={{ color: colors.ink }}>
                    {item.body}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isMine ? 'Delete comment' : 'Report comment'
                  }
                  onPress={() =>
                    isMine ? handleDelete(item.id) : handleReport(item)
                  }
                  hitSlop={8}
                  style={styles.iconAction}
                >
                  {isMine ? (
                    <Trash2 size={16} color={colors.inkMuted} />
                  ) : (
                    <Flag size={15} color={colors.inkMuted} />
                  )}
                </Pressable>
              </View>
            );
          }}
        />
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
            accessibilityLabel="Add a comment"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
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
            disabled={!trimmedInput || postCommentMutation.isPending}
            onPress={handleSend}
            style={[
              styles.sendButton,
              {
                backgroundColor: trimmedInput ? colors.accent : colors.line,
                opacity:
                  trimmedInput && !postCommentMutation.isPending ? 1 : 0.5,
              },
            ]}
          >
            <Send size={17} color={colors.accentInk} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  emptyState: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  commentRow: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  commentContent: { flex: 1, gap: spacing.xs },
  commentMetaRow: { alignItems: 'center', flexDirection: 'row' },
  iconAction: {
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  composerBar: {
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
