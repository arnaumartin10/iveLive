import { queryClient } from '../lib/queryClient';
import { useAuthStore } from '../features/auth/store';
import { useLogDraft } from '../features/log/store';
import { useMediaQueueStore } from '../features/media/queue';
import { useStatsScopeStore } from '../features/stats/store';
import { useTimelineStore } from '../features/concerts/timelineStore';

export async function clearSessionData(): Promise<void> {
  queryClient.clear();
  useAuthStore.getState().signOut();
  useLogDraft.getState().reset();
  useTimelineStore.getState().clear();
  useStatsScopeStore.getState().clear();
  await useMediaQueueStore.getState().clear();
}
