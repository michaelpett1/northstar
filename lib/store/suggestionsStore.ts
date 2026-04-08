'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RoadmapSuggestion,
  SuggestionSource,
  SuggestionStatus,
  TimelineItem,
} from '@/lib/types';
import { SEED_SUGGESTIONS } from '@/lib/data/mockData';
import { useProjectsStore } from './projectsStore';
import { useRoadmapStore } from './roadmapStore';
import { useActivityStore } from './activityStore';
import type { RoadmapTask } from '@/lib/types';
import {
  fetchSuggestions,
  upsertSuggestion as dbUpsertSuggestion,
  patchSuggestion as dbPatchSuggestion,
} from '@/lib/supabase/queries';

const hasSupabase = false; // TODO: restore when Supabase is configured
// const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

interface SuggestionsState {
  suggestions: RoadmapSuggestion[];
  isLoading: boolean;
  filterSource: SuggestionSource | null;
  filterStatus: SuggestionStatus | null;
  _loadedWorkspaceId: string | null;

  load: (workspaceId?: string) => Promise<void>;
  addSuggestions: (items: RoadmapSuggestion[]) => void;
  acceptSuggestion: (id: string, overrides?: Partial<TimelineItem>) => void;
  dismissSuggestion: (id: string) => void;
  deferSuggestion: (id: string, until: string) => void;
  bulkDismiss: (ids: string[]) => void;
  setFilterSource: (source: SuggestionSource | null) => void;
  setFilterStatus: (status: SuggestionStatus | null) => void;
  clearResolved: () => void;
}

export const useSuggestionsStore = create<SuggestionsState>()(
  persist(
    (set, get) => ({
      suggestions: [],
      isLoading: false,
      filterSource: null,
      filterStatus: null,
      _loadedWorkspaceId: null,

      load: async (workspaceId?: string) => {
        const prevWsId = useSuggestionsStore.getState()._loadedWorkspaceId;
        const wsId = workspaceId ?? null;
        if (prevWsId !== wsId) {
          set({ _loadedWorkspaceId: wsId });
        }
        if (!hasSupabase) return;
        set({ isLoading: true });
        try {
          const suggestions = await fetchSuggestions(workspaceId);
          if (suggestions.length > 0) set({ suggestions });
        } catch (err) {
          console.error('[suggestionsStore] load failed:', err);
        } finally {
          set({ isLoading: false });
        }
      },

      addSuggestions: (items) => {
        set((s) => {
          const existingIds = new Set(s.suggestions.map((sg) => sg.id));
          // Build a set of normalised titles across ALL statuses to prevent duplicates
          const existingTitles = new Set(
            s.suggestions.map((sg) => sg.title.trim().toLowerCase())
          );
          const newItems = items.filter((i) => {
            if (existingIds.has(i.id)) return false;
            // Skip if a suggestion with the same title already exists (any status)
            if (existingTitles.has(i.title.trim().toLowerCase())) return false;
            return true;
          });
          if (hasSupabase && newItems.length > 0) {
            const wsId = useSuggestionsStore.getState()._loadedWorkspaceId ?? undefined;
            newItems.forEach(item => {
              dbUpsertSuggestion(item, wsId).catch((err) => {
                console.error('[suggestionsStore] addSuggestion persist failed:', err);
              });
            });
          }
          return { suggestions: [...newItems, ...s.suggestions] };
        });
      },

      acceptSuggestion: (id, overrides) => {
        const suggestion = get().suggestions.find((s) => s.id === id);
        if (!suggestion) return;

        const now = new Date().toISOString();

        // Create a TimelineItem from the suggestion
        const newItem: TimelineItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: overrides?.title ?? suggestion.title,
          description: overrides?.description ?? suggestion.description,
          type: overrides?.type ?? suggestion.suggestedType,
          parentId: overrides?.parentId ?? null,
          status: overrides?.status ?? 'not_started',
          priority: overrides?.priority ?? suggestion.suggestedPriority,
          ownerId: overrides?.ownerId ?? '',
          startDate: overrides?.startDate ?? new Date().toISOString().split('T')[0],
          endDate: overrides?.endDate ?? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          progress: 0,
          dependencies: [],
          tags: [...suggestion.tags, ...(overrides?.tags ?? [])],
          groupId: overrides?.groupId ?? suggestion.suggestedGroupId,
          createdAt: now,
          updatedAt: now,
        };

        // Add to projects store (Timeline)
        useProjectsStore.getState().addItem(newItem);

        // Also create a RoadmapTask in the "Planning" section (sprint 0 = unscheduled)
        const roadmapTask: RoadmapTask = {
          id: `rt-${newItem.id}`,
          title: newItem.title,
          type: 'dev',
          project: suggestion.tags[0] ?? '',
          jiraUrl: suggestion.source.jiraUrl ?? '',
          assigneeId: newItem.ownerId,
          startSprint: 0,
          endSprint: 0,
          priority: newItem.priority,
          createdAt: now,
          timelineItemId: newItem.id,
        };
        useRoadmapStore.getState().addTask(roadmapTask);

        // Mark suggestion as accepted
        set((s) => ({
          suggestions: s.suggestions.map((sg) =>
            sg.id === id ? { ...sg, status: 'accepted' as const, reviewedAt: now } : sg
          ),
        }));

        if (hasSupabase) {
          dbPatchSuggestion(id, { status: 'accepted', reviewedAt: now }).catch((err) => {
            console.error('[suggestionsStore] acceptSuggestion persist failed:', err);
          });
        }

        // Log source context
        const sourceLabel =
          suggestion.source.type === 'jira'
            ? suggestion.source.jiraKey ?? 'JIRA'
            : suggestion.source.type === 'confluence'
            ? 'Confluence'
            : suggestion.source.type === 'document'
            ? suggestion.source.documentFileName ?? 'Document'
            : `#${suggestion.source.slackChannelName ?? 'Slack'}`;
        useActivityStore.getState().log(
          `Added "${newItem.title}" from ${sourceLabel} suggestion`,
          'created'
        );
      },

      dismissSuggestion: (id) => {
        const now = new Date().toISOString();
        set((s) => ({
          suggestions: s.suggestions.map((sg) =>
            sg.id === id ? { ...sg, status: 'dismissed' as const, reviewedAt: now } : sg
          ),
        }));
        if (hasSupabase) {
          dbPatchSuggestion(id, { status: 'dismissed', reviewedAt: now }).catch((err) => {
            console.error('[suggestionsStore] dismissSuggestion persist failed:', err);
          });
        }
      },

      deferSuggestion: (id, until) => {
        const now = new Date().toISOString();
        set((s) => ({
          suggestions: s.suggestions.map((sg) =>
            sg.id === id
              ? { ...sg, status: 'deferred' as const, deferredUntil: until, reviewedAt: now }
              : sg
          ),
        }));
        if (hasSupabase) {
          dbPatchSuggestion(id, { status: 'deferred', deferredUntil: until, reviewedAt: now }).catch((err) => {
            console.error('[suggestionsStore] deferSuggestion persist failed:', err);
          });
        }
      },

      bulkDismiss: (ids) => {
        const now = new Date().toISOString();
        const idSet = new Set(ids);
        set((s) => ({
          suggestions: s.suggestions.map((sg) =>
            idSet.has(sg.id) ? { ...sg, status: 'dismissed' as const, reviewedAt: now } : sg
          ),
        }));
        if (hasSupabase) {
          ids.forEach(id => {
            dbPatchSuggestion(id, { status: 'dismissed', reviewedAt: now }).catch((err) => {
              console.error('[suggestionsStore] bulkDismiss persist failed:', err);
            });
          });
        }
      },

      setFilterSource: (source) => set({ filterSource: source }),
      setFilterStatus: (status) => set({ filterStatus: status }),

      clearResolved: () => {
        set((s) => ({
          suggestions: s.suggestions.filter(
            (sg) => sg.status === 'pending' || sg.status === 'deferred'
          ),
        }));
      },
    }),
    {
      name: 'northstar-suggestions',
      version: 3,
      migrate: () => ({
        suggestions: [],
      }),
      partialize: (state) => ({
        suggestions: state.suggestions,
      }),
    }
  )
);
