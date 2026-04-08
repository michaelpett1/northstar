'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Objective, KeyResult, CheckIn, OKRStatus } from '@/lib/types';
import { OBJECTIVES } from '@/lib/data/mockData';
import {
  fetchObjectives,
  addCheckIn as dbAddCheckIn,
  patchKeyResult as dbPatchKeyResult,
  upsertObjective as dbUpsertObjective,
  deleteObjective as dbDeleteObjective,
  upsertKeyResult as dbUpsertKeyResult,
  deleteKeyResult as dbDeleteKeyResult,
} from '@/lib/supabase/queries';
import { useActivityStore } from './activityStore';

const hasSupabase = false; // TODO: restore when Supabase is configured
// const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

interface OKRsState {
  objectives: Objective[];
  isLoading: boolean;
  selectedObjectiveId: string | null;
  filterPeriod: string | null;
  filterOwnerId: string | null;
  checkInModalKRId: string | null;
  _loadedWorkspaceId: string | null;

  load: (workspaceId?: string) => Promise<void>;
  selectObjective: (id: string | null) => void;
  setFilterPeriod: (period: string | null) => void;
  setFilterOwnerId: (id: string | null) => void;
  openCheckIn: (krId: string) => void;
  closeCheckIn: () => void;
  updateKeyResult: (objectiveId: string, krId: string, patch: Partial<KeyResult>) => void;
  addCheckIn: (objectiveId: string, krId: string, checkIn: { value: number; note: string }) => Promise<void>;
  addObjective: (obj: Objective) => void;
  updateObjective: (id: string, patch: Partial<Objective>) => void;
  deleteObjective: (id: string) => void;
  updateObjectiveStatus: (id: string, status: OKRStatus) => void;
  addKeyResult: (objectiveId: string, kr: KeyResult) => void;
  removeKeyResult: (objectiveId: string, krId: string) => void;
}

export const useOKRsStore = create<OKRsState>()(
  persist(
    (set, get) => ({
      objectives: [],
      isLoading: false,
      selectedObjectiveId: null,
      filterPeriod: null,
      filterOwnerId: null,
      checkInModalKRId: null,
      _loadedWorkspaceId: null,

      load: async (workspaceId?: string) => {
        const prevWsId = get()._loadedWorkspaceId;
        const wsId = workspaceId ?? null;

        if (prevWsId !== wsId) {
          // Just track which workspace we're in — data is loaded from localStorage via persist
          set({ _loadedWorkspaceId: wsId });
        }

        if (!hasSupabase) return;
        set({ isLoading: true });
        try {
          const objectives = await fetchObjectives(workspaceId);
          if (objectives.length > 0) set({ objectives });
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

        const kr = get().objectives.flatMap(o => o.keyResults).find(k => k.id === krId);
        if (kr) {
          useActivityStore.getState().log(`Check-in on "${kr.title}": ${checkIn.value}`, 'checkin');
        }
      },

      addObjective: (obj) => {
        set((state) => ({ objectives: [...state.objectives, obj] }));
        useActivityStore.getState().log(`Created new objective: "${obj.title}"`, 'created');
        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          dbUpsertObjective(obj, wsId).catch((err) => {
            console.error('[okrsStore] addObjective persist failed:', err);
          });
        }
      },

      updateObjective: (id, patch) => {
        set((state) => ({
          objectives: state.objectives.map((obj) =>
            obj.id === id ? { ...obj, ...patch, updatedAt: new Date().toISOString() } : obj
          ),
        }));
        if (hasSupabase) {
          const updated = get().objectives.find(o => o.id === id);
          if (updated) {
            const wsId = get()._loadedWorkspaceId ?? undefined;
            dbUpsertObjective(updated, wsId).catch((err) => {
              console.error('[okrsStore] updateObjective persist failed:', err);
            });
          }
        }
      },

      deleteObjective: (id) => {
        const obj = get().objectives.find(o => o.id === id);
        set((state) => ({
          objectives: state.objectives.filter((o) => o.id !== id),
        }));
        if (obj) {
          useActivityStore.getState().log(`Deleted objective: "${obj.title}"`, 'status_change');
        }
        if (hasSupabase) {
          dbDeleteObjective(id).catch((err) => {
            console.error('[okrsStore] deleteObjective persist failed:', err);
          });
        }
      },

      updateObjectiveStatus: (id, status) => {
        set((state) => ({
          objectives: state.objectives.map((obj) =>
            obj.id === id ? { ...obj, status, updatedAt: new Date().toISOString() } : obj
          ),
        }));
        if (hasSupabase) {
          const updated = get().objectives.find(o => o.id === id);
          if (updated) {
            const wsId = get()._loadedWorkspaceId ?? undefined;
            dbUpsertObjective(updated, wsId).catch((err) => {
              console.error('[okrsStore] updateObjectiveStatus persist failed:', err);
            });
          }
        }
      },

      addKeyResult: (objectiveId, kr) => {
        set((state) => ({
          objectives: state.objectives.map((obj) =>
            obj.id === objectiveId
              ? { ...obj, keyResults: [...obj.keyResults, kr], updatedAt: new Date().toISOString() }
              : obj
          ),
        }));
        useActivityStore.getState().log(`Added key result "${kr.title}"`, 'created');
        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          dbUpsertKeyResult(kr, wsId).catch((err) => {
            console.error('[okrsStore] addKeyResult persist failed:', err);
          });
        }
      },

      removeKeyResult: (objectiveId, krId) => {
        const kr = get().objectives.flatMap(o => o.keyResults).find(k => k.id === krId);
        set((state) => ({
          objectives: state.objectives.map((obj) =>
            obj.id === objectiveId
              ? { ...obj, keyResults: obj.keyResults.filter(k => k.id !== krId), updatedAt: new Date().toISOString() }
              : obj
          ),
        }));
        if (kr) {
          useActivityStore.getState().log(`Removed key result "${kr.title}"`, 'status_change');
        }
        if (hasSupabase) {
          dbDeleteKeyResult(krId).catch((err) => {
            console.error('[okrsStore] removeKeyResult persist failed:', err);
          });
        }
      },
    }),
    {
      name: 'northstar-okrs',
      partialize: (state) => ({
        objectives: state.objectives,
      }),
    }
  )
);
