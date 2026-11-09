import { Redirect } from 'expo-router';
import { routes } from '../../navigation/routes';

export default function LegacyUserFriendsRoute() {
  return <Redirect href={routes.profile('friends')} />;
}
