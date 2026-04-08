'use client';
import { create } from 'zustand';
import type { ActivityEvent } from '@/lib/types';
import {
  insertActivityEvent,
  fetchActivityEvents,
} from '@/lib/supabase/queries';

const hasSupabase = false; // TODO: restore when Supabase is configured
// const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

interface ActivityState {
  events: ActivityEvent[];
  _loadedWorkspaceId: string | null;
  readCount: number;
  load: (workspaceId?: string) => Promise<void>;
  log: (text: string, type: ActivityEvent['type']) => void;
  markAllRead: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  events: [],
  _loadedWorkspaceId: null,
  readCount: 0,

  load: async (workspaceId?: string) => {
    const wsId = workspaceId ?? null;
    set({ _loadedWorkspaceId: wsId });
    if (!hasSupabase) return;
    try {
      const events = await fetchActivityEvents(workspaceId);
      if (events.length > 0) set({ events });
    } catch (err) {
      console.error('[activityStore] load failed:', err);
    }
  },

  log: (text, type) => {
    const event: ActivityEvent = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text,
      timestamp: new Date().toISOString(),
      type,
    };
    set((s) => ({ events: [event, ...s.events].slice(0, 50) }));

    if (hasSupabase) {
      const wsId = get()._loadedWorkspaceId ?? undefined;
      insertActivityEvent(text, type, wsId).catch((err) => {
        console.error('[activityStore] log persist failed:', err);
      });
    }
  },

  markAllRead: () => {
    set((s) => ({ readCount: s.events.length }));
  },
}));
