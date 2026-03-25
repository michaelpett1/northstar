'use client';
import { create } from 'zustand';
import type { TimelineItem, TimelineViewMode, GanttScale } from '@/lib/types';
import { TIMELINE_ITEMS } from '@/lib/data/mockData';
import { fetchTimelineItems, patchTimelineItem, upsertTimelineItem } from '@/lib/supabase/queries';

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface ProjectsState {
  items: TimelineItem[];
  isLoading: boolean;
  viewMode: TimelineViewMode;
  ganttScale: GanttScale;
  selectedItemId: string | null;
  filterStatus: string | null;
  filterOwnerId: string | null;
  filterPriority: string | null;

  load: () => Promise<void>;
  setViewMode: (mode: TimelineViewMode) => void;
  setGanttScale: (scale: GanttScale) => void;
  selectItem: (id: string | null) => void;
  updateItem: (id: string, patch: Partial<TimelineItem>) => void;
  addItem: (item: TimelineItem) => void;
  setFilterStatus: (status: string | null) => void;
  setFilterOwnerId: (id: string | null) => void;
  setFilterPriority: (priority: string | null) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  items: TIMELINE_ITEMS,
  isLoading: false,
  viewMode: 'gantt',
  ganttScale: 'month',
  selectedItemId: null,
  filterStatus: null,
  filterOwnerId: null,
  filterPriority: null,

  load: async () => {
    if (!hasSupabase) return;
    set({ isLoading: true });
    try {
      const items = await fetchTimelineItems();
      set({ items });
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
    // Optimistic local update
    const now = new Date().toISOString();
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: now } : item
      ),
    }));
    // Persist to Supabase
    if (hasSupabase) {
      patchTimelineItem(id, patch).catch((err) => {
        console.error('[projectsStore] updateItem persist failed:', err);
      });
    }
  },

  addItem: (item) => {
    set((state) => ({ items: [...state.items, item] }));
    if (hasSupabase) {
      upsertTimelineItem(item).catch((err) => {
        console.error('[projectsStore] addItem persist failed:', err);
      });
    }
  },

  setFilterStatus: (status) => set({ filterStatus: status }),
  setFilterOwnerId: (id) => set({ filterOwnerId: id }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
}));
