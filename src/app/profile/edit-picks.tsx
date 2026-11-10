import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { PicksEditorScreen } from '../../components/profile/PicksEditorScreen';
import { useMe } from '../../features/auth/hooks';
import { useProfileOverview, useSetPicks } from '../../features/profile/hooks';
import { useSafeBack } from '../../navigation/useSafeBack';
import { routes } from '../../navigation/routes';
import { useTheme } from '../../theme/ThemeProvider';

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function EditPicksRoute() {
  const params = useLocalSearchParams<{ username?: string; list?: string }>();
  const username = firstParam(params.username);
  const list = firstParam(params.list) === 'favourite' ? 'favourite' : 'recent';
  const me = useMe();
  const overview = useProfileOverview(username);
  const setPicks = useSetPicks(username);
  const safeBack = useSafeBack(routes.profile('profile'));
  const { colors } = useTheme();
  const profile = overview.data?.profile;
  const initialPicks =
    list === 'recent'
      ? (overview.data?.recent_picks ?? [])
      : (overview.data?.favourite_picks ?? []);

  useEffect(() => {
    if (!me.isLoading && me.data && username && me.data.username !== username) {
      router.replace(routes.profile('profile'));
    }
  }, [me.data, me.isLoading, username]);

  if (me.isLoading || overview.isLoading) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: colors.bg }]}>
        <View style={styles.state}>
          <Skeleton height={56} />
          <Skeleton height={120} />
          <Skeleton height={200} />
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
    overview.data?.restricted
  ) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: colors.bg }]}>
        <View style={styles.state}>
          <EmptyState
            title="Picks unavailable"
            description={
              overview.error?.message ??
              'Your profile picks could not be loaded.'
            }
            action={<Button label="Go back" onPress={safeBack} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PicksEditorScreen
      key={`${username}-${list}`}
      list={list}
      initialPicks={initialPicks}
      onDismiss={safeBack}
      onSave={async (picks) => {
        await setPicks.mutateAsync({ list, picks });
      }}
    />
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  state: { flex: 1, gap: 16, justifyContent: 'center', padding: 20 },
});
