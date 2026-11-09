import { StyleSheet, View } from 'react-native';
import { CollapsibleHeaderLayout } from '../../components/navigation/CollapsibleHeaderLayout';
import { CloudGraph } from '../../features/cloud/CloudGraph';

export default function CloudTabScreen() {
  return (
    <CollapsibleHeaderLayout title="Cloud" subtitle="Artist Point Cloud">
      <View style={styles.content}>
        <CloudGraph />
      </View>
    </CollapsibleHeaderLayout>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
});
