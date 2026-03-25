'use client';
import { create } from 'zustand';
import type { Objective, KeyResult, CheckIn, OKRStatus } from '@/lib/types';
import { OBJECTIVES } from '@/lib/data/mockData';
import {
  fetchObjectives,
  addCheckIn as dbAddCheckIn,
  patchKeyResult as dbPatchKeyResult,
} from '@/lib/supabase/queries';

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface OKRsState {
  objectives: Objective[];
  isLoading: boolean;
  selectedObjectiveId: string | null;
  filterPeriod: string | null;
  filterOwnerId: string | null;
  checkInModalKRId: string | null;

  load: () => Promise<void>;
  selectObjective: (id: string | null) => void;
  setFilterPeriod: (period: string | null) => void;
  setFilterOwnerId: (id: string | null) => void;
  openCheckIn: (krId: string) => void;
  closeCheckIn: () => void;
  updateKeyResult: (objectiveId: string, krId: string, patch: Partial<KeyResult>) => void;
  addCheckIn: (objectiveId: string, krId: string, checkIn: { value: number; note: string }) => Promise<void>;
  addObjective: (obj: Objective) => void;
  updateObjectiveStatus: (id: string, status: OKRStatus) => void;
}

export const useOKRsStore = create<OKRsState>((set, get) => ({
  objectives: OBJECTIVES,
  isLoading: false,
  selectedObjectiveId: null,
  filterPeriod: null,
  filterOwnerId: null,
  checkInModalKRId: null,

  load: async () => {
    if (!hasSupabase) return;
    set({ isLoading: true });
    try {
      const objectives = await fetchObjectives();
      set({ objectives });
    } catch (err) {
      console.error('[okrsStore] load failed:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  selectObjective: (id) => set({ selectedObjectiveId: id }),
  setFilterPeriod: (period) => set({ filterPeriod: period }),
  setFilterOwnerId: (id) => set({ filterOwnerId: id }),
  openCheckIn: (krId) => set({ checkInModalKRId: krId }),
  closeCheckIn: () => set({ checkInModalKRId: null }),

  updateKeyResult: (objectiveId, krId, patch) => {
    set((state) => ({
      objectives: state.objectives.map((obj) =>
        obj.id === objectiveId
          ? {
              ...obj,
              keyResults: obj.keyResults.map((kr) =>
                kr.id === krId ? { ...kr, ...patch, updatedAt: new Date().toISOString() } : kr
              ),
            }
          : obj
      ),
    }));
    if (hasSupabase) {
      const dbPatch: { confidence?: string; current_value?: number } = {};
      if (patch.confidence !== undefined) dbPatch.confidence = patch.confidence;
      if (patch.currentValue !== undefined) dbPatch.current_value = patch.currentValue;
      if (Object.keys(dbPatch).length > 0) {
        dbPatchKeyResult(krId, dbPatch).catch((err) => {
          console.error('[okrsStore] updateKeyResult persist failed:', err);
        });
      }
    }
  },

  addCheckIn: async (objectiveId, krId, checkIn) => {
    let newCheckIn: CheckIn;

    if (hasSupabase) {
      try {
        newCheckIn = await dbAddCheckIn(objectiveId, krId, checkIn);
      } catch (err) {
        console.error('[okrsStore] addCheckIn persist failed:', err);
        newCheckIn = {
          id: `ci-${Date.now()}`,
          value: checkIn.value,
          note: checkIn.note,
          createdAt: new Date().toISOString(),
        };
      }
    } else {
      newCheckIn = {
        id: `ci-${Date.now()}`,
        value: checkIn.value,
        note: checkIn.note,
        createdAt: new Date().toISOString(),
      };
    }

    set((state) => ({
      objectives: state.objectives.map((obj) =>
        obj.id === objectiveId
          ? {
              ...obj,
              keyResults: obj.keyResults.map((kr) =>
                kr.id === krId
                  ? {
                      ...kr,
                      checkIns: [...kr.checkIns, newCheckIn],
                      currentValue: checkIn.value,
                      updatedAt: new Date().toISOString(),
                    }
                  : kr
              ),
            }
          : obj
      ),
    }));
  },

  addObjective: (obj) => set((state) => ({ objectives: [...state.objectives, obj] })),

  updateObjectiveStatus: (id, status) =>
    set((state) => ({
      objectives: state.objectives.map((obj) =>
        obj.id === id ? { ...obj, status, updatedAt: new Date().toISOString() } : obj
      ),
    })),
}));
