import React from 'react';
import { CollapsibleHeaderLayout } from '../../components/navigation/CollapsibleHeaderLayout';
import { CloudGraph } from '../../features/cloud/CloudGraph';

export default function CloudTabScreen() {
  return (
    <CollapsibleHeaderLayout title="Cloud" subtitle="Artist Point Cloud">
      <CloudGraph />
    </CollapsibleHeaderLayout>
  );
}
