import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { WishlistEditorScreen } from '../../components/profile/WishlistEditorScreen';
import { useMe } from '../../features/auth/hooks';
import {
  useAddWishlistItem,
  useFullWishlist,
  useProfileOverview,
  useUpdateWishlistItem,
} from '../../features/profile/hooks';
import { useSafeBack } from '../../navigation/useSafeBack';
import { routes } from '../../navigation/routes';
import { useTheme } from '../../theme/ThemeProvider';
import type { WishlistDraft } from '../../features/profile/types';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function EditWishlistRoute() {
  const params = useLocalSearchParams<{
    username?: string;
    itemId?: string;
  }>();
  const username = firstParam(params.username);
  const itemId = firstParam(params.itemId);
  const me = useMe();
  const overview = useProfileOverview(username);
  const wishlist = useFullWishlist(username, itemId ? me.data?.id : undefined);
  const addWishlistItem = useAddWishlistItem(username);
  const updateWishlistItem = useUpdateWishlistItem(username);
  const safeBack = useSafeBack(routes.profile('wishlist'));
  const { colors } = useTheme();
  const profile = overview.data?.profile;
  const item = itemId
    ? wishlist.data?.find((candidate) => candidate.id === itemId)
    : undefined;

  useEffect(() => {
    if (!me.isLoading && me.data && username && me.data.username !== username) {
      router.replace(routes.profile('profile'));
    }
  }, [me.data, me.isLoading, username]);

  if (me.isLoading || overview.isLoading || (itemId && wishlist.isLoading)) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: colors.bg }]}>
        <View style={styles.state}>
          <Skeleton height={56} />
          <Skeleton height={110} />
          <Skeleton height={180} />
        </View>
      </SafeAreaView>
    );
  }

  if (
    !username ||
    overview.isError ||
    !profile ||
    !me.data ||
    me.data.id !== profile.id ||
    overview.data?.restricted ||
    (itemId && (wishlist.isError || !item))
  ) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: colors.bg }]}>
        <View style={styles.state}>
          <EmptyState
            title={
              itemId ? 'Wishlist item unavailable' : 'Wishlist unavailable'
            }
            description={
              wishlist.error?.message ??
              overview.error?.message ??
              'This item could not be found or edited.'
            }
            action={<Button label="Go back" onPress={safeBack} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <WishlistEditorScreen
      key={itemId || 'new'}
      initialItem={item}
      onDismiss={safeBack}
      onSave={async (draft: WishlistDraft) => {
        if (item) {
          await updateWishlistItem.mutateAsync({
            itemId: item.id,
            updates: draft,
          });
        } else {
          await addWishlistItem.mutateAsync({
            userId: profile.id,
            draft,
          });
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  state: { flex: 1, gap: 16, justifyContent: 'center', padding: 20 },
});
