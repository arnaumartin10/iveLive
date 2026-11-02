import { CollapsibleHeaderLayout } from '../../components/navigation/CollapsibleHeaderLayout';
import { StatsScreen } from '../../components/stats/StatsScreen';

export default function StatsTabScreen() {
  return (
    <CollapsibleHeaderLayout title="Stats" subtitle="Your live music story">
      <StatsScreen />
    </CollapsibleHeaderLayout>
  );
}
