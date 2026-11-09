import { Redirect } from 'expo-router';
import { routes } from '../navigation/routes';

export default function LegacyArchiveRoute() {
  return <Redirect href={routes.profile('timeline')} />;
}
