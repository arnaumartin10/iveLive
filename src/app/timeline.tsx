import { Redirect } from 'expo-router';
import { routes } from '../navigation/routes';

export default function LegacyTimelineRoute() {
  return <Redirect href={routes.profile('timeline')} />;
}
