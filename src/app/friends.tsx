import { Redirect } from 'expo-router';
import { routes } from '../navigation/routes';

export default function LegacyFriendsRoute() {
  return <Redirect href={routes.profile('friends')} />;
}
