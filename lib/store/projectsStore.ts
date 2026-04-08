'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimelineItem, TimelineViewMode, GanttScale, TimelineGroup } from '@/lib/types';
import { TIMELINE_ITEMS } from '@/lib/data/mockData';
import {
  fetchTimelineItems,
  patchTimelineItem,
  upsertTimelineItem,
  deleteTimelineItem,
  fetchTimelineGroups,
  upsertTimelineGroup,
  deleteTimelineGroup as dbDeleteTimelineGroup,
} from '@/lib/supabase/queries';
import { useActivityStore } from './activityStore';
import { useRoadmapStore } from './roadmapStore';

const hasSupabase = false; // TODO: restore when Supabase is configured
// const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const DEFAULT_GROUPS: TimelineGroup[] = [
  { id: 'grp-1', name: 'New Features', color: '#2563EB' },
  { id: 'grp-2', name: 'Existing Product Improvements', color: '#22C55E' },
  { id: 'grp-3', name: 'Hygiene Improvements', color: '#EC4899' },
  { id: 'grp-4', name: 'Free to Play', color: '#F59E0B' },
];

interface ProjectsState {
  items: TimelineItem[];
  groups: TimelineGroup[];
  isLoading: boolean;
  viewMode: TimelineViewMode;
  ganttScale: GanttScale;
  selectedItemId: string | null;
  filterStatus: string | null;
  filterOwnerId: string | null;
  _loadedWorkspaceId: string | null;
  filterPriority: string | null;

  load: (workspaceId?: string) => Promise<void>;
  setViewMode: (mode: TimelineViewMode) => void;
  setGanttScale: (scale: GanttScale) => void;
  selectItem: (id: string | null) => void;
  updateItem: (id: string, patch: Partial<TimelineItem>) => void;
  addItem: (item: TimelineItem) => void;
  deleteItem: (id: string) => void;
  setFilterStatus: (status: string | null) => void;
  setFilterOwnerId: (id: string | null) => void;
  setFilterPriority: (priority: string | null) => void;
  reorderItems: (fromId: string, toId: string) => void;
  addGroup: (group: TimelineGroup) => void;
  updateGroup: (id: string, patch: Partial<TimelineGroup>) => void;
  removeGroup: (id: string) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      items: [],
      groups: [],
      isLoading: false,
      viewMode: 'gantt',
      ganttScale: 'week',
      selectedItemId: null,
      filterStatus: null,
      filterOwnerId: null,
      filterPriority: null,
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
          const [items, groups] = await Promise.all([
            fetchTimelineItems(workspaceId),
            fetchTimelineGroups(workspaceId),
          ]);
          if (items.length > 0) set({ items });
          if (groups.length > 0) set({ groups });
        } catch (err) {
          console.error('[projectsStore] load failed:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      setViewMode: (mode) => set({ viewMode: mode }),
      setGanttScale: (scale) => set({ ganttScale: scale }),
      selectItem: (id) => set({ selectedItemId: id }),

      updateItem: (id, patch) => {
        const now = new Date().toISOString();
        const item = get().items.find(i => i.id === id);

        // Validate: end date must not be before start date
        if (item) {
          const newStart = patch.startDate ?? item.startDate;
          const newEnd = patch.endDate ?? item.endDate;
          if (newEnd < newStart) return; // reject invalid date range
        }

        if (patch.status === 'complete' && !('progress' in patch)) {
          patch.progress = 100;
        }
        if (patch.progress === 100 && item && item.status !== 'complete') {
          patch.status = 'complete';
        }
        // Auto-set to in_progress when progress moves above 0
        if (
          patch.progress !== undefined &&
          patch.progress > 0 &&
          patch.progress < 100 &&
          item &&
          (item.status === 'not_started' || patch.status === undefined)
        ) {
          const currentStatus = patch.status ?? item.status;
          if (currentStatus === 'not_started') {
            patch.status = 'in_progress';
          }
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: now } : item
          ),
        }));

        if (item) {
          if (patch.status) {
            useActivityStore.getState().log(
              `"${item.title}" status changed to ${patch.status.replace('_', ' ')}`,
              'status_change'
            );
          } else if (patch.progress !== undefined) {
            // Only log progress at milestones (0%, 25%, 50%, 75%, 100%) to avoid notification spam
            const milestones = [0, 25, 50, 75, 100];
            const oldProgress = item.progress ?? 0;
            const newProgress = patch.progress;
            const crossedMilestone = milestones.find(m =>
              (oldProgress < m && newProgress >= m) || (oldProgress > m && newProgress <= m)
            );
            if (crossedMilestone !== undefined || newProgress === 100) {
              useActivityStore.getState().log(
                `"${item.title}" progress reached ${newProgress}%`,
                'progress'
              );
            }
          }
        }

        if (hasSupabase) {
          patchTimelineItem(id, patch).catch((err) => {
            console.error('[projectsStore] updateItem persist failed:', err);
          });
        }

        // Sync to linked RoadmapTask
        try {
          const roadmapStore = useRoadmapStore.getState();
          const linkedTask = roadmapStore.tasks.find((t) => t.timelineItemId === id);
          if (linkedTask) {
            const roadmapPatch: Record<string, unknown> = {};
            if (patch.title !== undefined) roadmapPatch.title = patch.title;
            if (patch.ownerId !== undefined) roadmapPatch.assigneeId = patch.ownerId;
            if (patch.priority !== undefined) {
              roadmapPatch.priority = patch.priority === 'p0' || patch.priority === 'p1';
            }
            if (Object.keys(roadmapPatch).length > 0) {
              roadmapStore.updateTask(linkedTask.id, roadmapPatch as Partial<import('@/lib/types').RoadmapTask>);
            }
          }
        } catch {
          // Roadmap store may not be loaded yet — safe to ignore
        }
      },

      addItem: (item) => {
        set((state) => ({ items: [...state.items, item] }));
        useActivityStore.getState().log(`Created new ${item.type}: "${item.title}"`, 'created');
        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          upsertTimelineItem(item, wsId).catch((err) => {
            console.error('[projectsStore] addItem persist failed:', err);
          });
        }
      },

      deleteItem: (id) => {
        const item = get().items.find(i => i.id === id);
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
          selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        }));
        if (item) {
          useActivityStore.getState().log(`Deleted ${item.type}: "${item.title}"`, 'status_change');
        }
        if (hasSupabase) {
          deleteTimelineItem(id).catch((err) => {
            console.error('[projectsStore] deleteItem persist failed:', err);
          });
        }
      },

      setFilterStatus: (status) => set({ filterStatus: status }),
      setFilterOwnerId: (id) => set({ filterOwnerId: id }),
      setFilterPriority: (priority) => set({ filterPriority: priority }),

      reorderItems: (fromId, toId) => {
        set((state) => {
          const items = [...state.items];
          const fromIdx = items.findIndex(i => i.id === fromId);
          const toIdx = items.findIndex(i => i.id === toId);
          if (fromIdx === -1 || toIdx === -1) return state;
          const [moved] = items.splice(fromIdx, 1);
          items.splice(toIdx, 0, moved);
          // Persist sort order to Supabase
          if (hasSupabase) {
            items.forEach((item, idx) => {
              patchTimelineItem(item.id, { sortOrder: idx } as never).catch(() => {});
            });
          }
          return { items };
        });
      },

      addGroup: (group) => {
        set((s) => ({ groups: [...s.groups, group] }));
        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          const newLen = get().groups.length;
          upsertTimelineGroup(group, newLen - 1, wsId).catch((err) => {
            console.error('[projectsStore] addGroup persist failed:', err);
          });
        }
      },
      updateGroup: (id, patch) => {
        set((s) => ({
          groups: s.groups.map(g => g.id === id ? { ...g, ...patch } : g),
        }));
        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          const updated = get().groups.find(g => g.id === id);
          const idx = get().groups.findIndex(g => g.id === id);
          if (updated) {
            upsertTimelineGroup(updated, idx, wsId).catch((err) => {
              console.error('[projectsStore] updateGroup persist failed:', err);
            });
          }
        }
      },
      removeGroup: (id) => {
        set((s) => ({
          groups: s.groups.filter(g => g.id !== id),
          items: s.items.map(i => i.groupId === id ? { ...i, groupId: '' } : i),
        }));
        if (hasSupabase) {
          dbDeleteTimelineGroup(id).catch((err) => {
            console.error('[projectsStore] removeGroup persist failed:', err);
          });
          // Also update items that had this groupId
          const items = get().items.filter(i => i.groupId === '');
          items.forEach(i => {
            patchTimelineItem(i.id, { groupId: '' } as never).catch(() => {});
          });
        }
      },
    }),
    {
      name: 'northstar-projects',
      version: 2,
      migrate: () => ({
        items: [],
        groups: [],
      }),
      partialize: (state) => ({
        groups: state.groups,
        items: state.items,
      }),
    }
  )
);
