import { create } from 'zustand';
import type { StatsScope } from './types';

type StatsScopeState = {
  scope: StatsScope;
  setScope: (scope: StatsScope) => void;
  clear: () => void;
};

export const useStatsScopeStore = create<StatsScopeState>((set) => ({
  scope: null,
  setScope: (scope) => set({ scope }),
  clear: () => set({ scope: null }),
}));
