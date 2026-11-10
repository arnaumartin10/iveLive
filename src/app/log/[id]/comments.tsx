import { useLocalSearchParams } from 'expo-router';
import { CommentsScreen } from '../../../components/social/CommentsScreen';
import { routes } from '../../../navigation/routes';
import { useSafeBack } from '../../../navigation/useSafeBack';

export default function LogCommentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const safeBack = useSafeBack(id ? routes.log(id) : routes.fallback.log());

  if (!id) return null;

  return <CommentsScreen logId={id} onBack={safeBack} />;
}
