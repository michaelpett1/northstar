'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoadmapTask, Priority } from '@/lib/types';
import { GDC_SEED_ROADMAP_TASKS } from '@/lib/data/mockData';
import {
  fetchRoadmapTasks,
  upsertRoadmapTask,
  deleteRoadmapTask as dbDeleteRoadmapTask,
  patchRoadmapTask,
  fetchSprintCapacities,
  upsertSprintCapacity,
  fetchRoadmapProjects,
  upsertRoadmapProject,
} from '@/lib/supabase/queries';

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const P_RANK: Record<Priority, number> = { p0: 0, p1: 1, p2: 2, p3: 3 };

// Sprints: 2-week sprints starting 2026-01-01. Generate 26 sprints (full year).
export function generateSprints(count = 26) {
  // Sprint 7 is current (starts Apr 2 2026)
  const base = new Date('2026-01-08');
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(base);
    start.setDate(base.getDate() + i * 14);
    const end = new Date(start);
    end.setDate(start.getDate() + 13);
    const month = start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return {
      number: i + 1,
      label: `Sprint ${i + 1}`,
      month,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  });
}

const ALL_SPRINTS = generateSprints(26);

export function getCurrentSprintNumber(): number {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  for (const s of ALL_SPRINTS) {
    if (todayStr >= s.startDate && todayStr <= s.endDate) return s.number;
  }
  // If before first sprint, return 1; if after all, return last
  if (todayStr < ALL_SPRINTS[0].startDate) return 1;
  return ALL_SPRINTS[ALL_SPRINTS.length - 1].number;
}

export interface SprintCapacity {
  dev: number;
  ux: number;
}

const DEFAULT_CAPACITY: SprintCapacity = { dev: 7, ux: 5 };

const MAX_UNDO_HISTORY = 30;

interface UndoSnapshot {
  tasks: RoadmapTask[];
  sprintCapacities: Record<number, SprintCapacity>;
  label: string;
}

interface RoadmapState {
  tasks: RoadmapTask[];
  projects: string[];
  teams: string[];
  sprintCapacities: Record<number, SprintCapacity>;
  _undoStack: UndoSnapshot[];
  _loadedWorkspaceId: string | null;
  load: (workspaceId?: string) => Promise<void>;
  addTask: (task: RoadmapTask) => void;
  updateTask: (id: string, patch: Partial<RoadmapTask>) => void;
  deleteTask: (id: string) => void;
  addProject: (name: string) => void;
  addTeam: (name: string) => void;
  moveTask: (id: string, toSprint: number) => void;
  shiftAllTasksUp: () => void;
  getCapacity: (sprintNumber: number) => SprintCapacity;
  setCapacity: (sprintNumber: number, type: 'dev' | 'ux', value: number) => void;
  seedIfEmpty: (workspaceId?: string) => void;
  undo: () => string | null;
  canUndo: () => boolean;
  getUndoLabel: () => string | null;
}

export const useRoadmapStore = create<RoadmapState>()(
  persist(
    (set, get) => {
      function pushUndo(label: string) {
        const { tasks, sprintCapacities, _undoStack } = get();
        const snapshot: UndoSnapshot = {
          tasks: tasks.map(t => ({ ...t })),
          sprintCapacities: JSON.parse(JSON.stringify(sprintCapacities)),
          label,
        };
        const newStack = [..._undoStack, snapshot].slice(-MAX_UNDO_HISTORY);
        set({ _undoStack: newStack });
      }

      return {
      tasks: [],
      projects: ['Design Hygiene', 'Genesis', 'IUJs', 'Existing Product Enhancements', 'Existing Product Improvements', 'Hygiene Improvements', 'Promo Campaigns', 'New Features', 'Free to Play'],
      teams: ['UX', 'DEV'],
      sprintCapacities: {},
      _undoStack: [] as UndoSnapshot[],
      _loadedWorkspaceId: null as string | null,

      load: async (workspaceId?: string) => {
        const prevWsId = get()._loadedWorkspaceId;
        const wsId = workspaceId ?? null;
        if (prevWsId !== wsId) {
          set({ _loadedWorkspaceId: wsId });
        }
        if (!hasSupabase) return;
        try {
          const [tasks, caps, projects] = await Promise.all([
            fetchRoadmapTasks(workspaceId),
            fetchSprintCapacities(workspaceId),
            fetchRoadmapProjects(workspaceId),
          ]);
          if (tasks.length > 0) set({ tasks });
          if (Object.keys(caps).length > 0) set({ sprintCapacities: caps });
          if (projects.length > 0) set({ projects });
        } catch (err) {
          console.error('[roadmapStore] load failed:', err);
        }
      },

      addTask: (task) => {
        pushUndo(`Add "${task.title}"`);
        set((s) => ({ tasks: [...s.tasks, task] }));
        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          upsertRoadmapTask(task, wsId).catch((err) => {
            console.error('[roadmapStore] addTask persist failed:', err);
          });
        }
      },
      updateTask: (id, patch) => {
        pushUndo('Edit task');
        set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }));
        if (hasSupabase) {
          patchRoadmapTask(id, patch).catch((err) => {
            console.error('[roadmapStore] updateTask persist failed:', err);
          });
        }
      },
      deleteTask: (id) => {
        const t = get().tasks.find(t => t.id === id);
        pushUndo(`Delete "${t?.title ?? 'task'}"`);
        set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) }));
        if (hasSupabase) {
          dbDeleteRoadmapTask(id).catch((err) => {
            console.error('[roadmapStore] deleteTask persist failed:', err);
          });
        }
      },
      addProject: (name) => {
        set((s) => ({ projects: [...s.projects, name] }));
        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          upsertRoadmapProject(name, wsId).catch((err) => {
            console.error('[roadmapStore] addProject persist failed:', err);
          });
        }
      },
      addTeam: (name) => set((s) => ({ teams: [...s.teams, name] })),
      moveTask: (id, toSprint) => {
        const t = get().tasks.find(t => t.id === id);
        pushUndo(`Move "${t?.title ?? 'task'}"`);
        set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, startSprint: toSprint, endSprint: toSprint } : t) }));
        if (hasSupabase) {
          patchRoadmapTask(id, { startSprint: toSprint, endSprint: toSprint }).catch((err) => {
            console.error('[roadmapStore] moveTask persist failed:', err);
          });
        }
      },

      shiftAllTasksUp: () => {
        const { tasks } = get();
        if (tasks.length === 0) return;
        pushUndo('Shift all tasks up one sprint');
        set({
          tasks: tasks.map(t => ({
            ...t,
            startSprint: Math.max(0, t.startSprint - 1),
            endSprint: Math.max(0, t.endSprint - 1),
          })),
        });
      },

      seedIfEmpty: (workspaceId?: string) => {
        const prevWsId = get()._loadedWorkspaceId;
        const wsId = workspaceId ?? null;

        if (prevWsId !== wsId) {
          // Just track which workspace we're in — data is loaded from localStorage via persist
          set({ _loadedWorkspaceId: wsId });
        }
      },

      getCapacity: (sprintNumber) => {
        const caps = get().sprintCapacities[sprintNumber];
        return caps ?? { ...DEFAULT_CAPACITY };
      },

      setCapacity: (sprintNumber, type, value) => {
        pushUndo(`Change ${type.toUpperCase()} capacity`);
        const state = get();
        const currentCap = state.sprintCapacities[sprintNumber] ?? { ...DEFAULT_CAPACITY };
        const oldValue = currentCap[type];
        const newValue = Math.max(0, Math.min(15, value));

        if (newValue === oldValue) return;

        // Update capacity
        const newCapacities = {
          ...state.sprintCapacities,
          [sprintNumber]: { ...currentCap, [type]: newValue },
        };

        let newTasks = [...state.tasks];

        if (newValue < oldValue) {
          // ── Capacity lowered: push overflow to next sprint ──
          // Get tasks of this type in this sprint, sorted by priority (non-priority first to push those)
          const tasksInSprint = newTasks
            .filter(t => t.type === type && t.startSprint === sprintNumber && t.startSprint !== 0)
            .sort((a, b) => {
              // Priority tasks stay, non-priority move first
              if (P_RANK[a.priority] !== P_RANK[b.priority]) return P_RANK[a.priority] - P_RANK[b.priority];
              // Newer tasks move first
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

          const overflow = tasksInSprint.length - newValue;
          if (overflow > 0) {
            // Take the last N tasks (non-priority, newest first)
            const toMove = tasksInSprint.slice(tasksInSprint.length - overflow);
            const toMoveIds = new Set(toMove.map(t => t.id));

            const nextSprint = sprintNumber + 1;
            const maxSprint = ALL_SPRINTS[ALL_SPRINTS.length - 1].number;

            if (nextSprint <= maxSprint) {
              newTasks = newTasks.map(t => {
                if (toMoveIds.has(t.id)) {
                  return { ...t, startSprint: nextSprint, endSprint: nextSprint };
                }
                return t;
              });

              // Cascade: check if next sprint now overflows too
              const nextCap = newCapacities[nextSprint] ?? { ...DEFAULT_CAPACITY };
              const nextSprintTaskCount = newTasks.filter(
                t => t.type === type && t.startSprint === nextSprint && t.startSprint !== 0
              ).length;

              if (nextSprintTaskCount > nextCap[type]) {
                // We'll cascade by recursively calling after this set
                // For simplicity, cascade up to 10 sprints deep
                let cascadeSprint = nextSprint;
                let cascadeTasks = newTasks;
                for (let depth = 0; depth < 10; depth++) {
                  const cap = newCapacities[cascadeSprint] ?? { ...DEFAULT_CAPACITY };
                  const tasksHere = cascadeTasks
                    .filter(t => t.type === type && t.startSprint === cascadeSprint && t.startSprint !== 0)
                    .sort((a, b) => {
                      if (P_RANK[a.priority] !== P_RANK[b.priority]) return P_RANK[a.priority] - P_RANK[b.priority];
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    });
                  const ov = tasksHere.length - cap[type];
                  if (ov <= 0) break;
                  const nextS = cascadeSprint + 1;
                  if (nextS > maxSprint) break;
                  const moveIds = new Set(tasksHere.slice(tasksHere.length - ov).map(t => t.id));
                  cascadeTasks = cascadeTasks.map(t =>
                    moveIds.has(t.id) ? { ...t, startSprint: nextS, endSprint: nextS } : t
                  );
                  cascadeSprint = nextS;
                }
                newTasks = cascadeTasks;
              }
            }
          }
        } else if (newValue > oldValue) {
          // ── Capacity raised: pull tasks back from later sprints ──
          const currentSprintNum = getCurrentSprintNumber();
          // Don't pull into past sprints
          if (sprintNumber >= currentSprintNum) {
            const tasksInSprint = newTasks.filter(
              t => t.type === type && t.startSprint === sprintNumber && t.startSprint !== 0
            ).length;
            const freeSlots = newValue - tasksInSprint;

            if (freeSlots > 0) {
              // Find tasks in the next sprint that could be pulled back
              const nextSprint = sprintNumber + 1;
              const maxSprint = ALL_SPRINTS[ALL_SPRINTS.length - 1].number;
              if (nextSprint <= maxSprint) {
                const pullCandidates = newTasks
                  .filter(t => t.type === type && t.startSprint === nextSprint && t.startSprint !== 0)
                  .sort((a, b) => {
                    // Pull higher priority tasks first
                    if (P_RANK[a.priority] !== P_RANK[b.priority]) return P_RANK[a.priority] - P_RANK[b.priority];
                    // Older tasks first
                    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                  });

                const toPull = pullCandidates.slice(0, freeSlots);
                const toPullIds = new Set(toPull.map(t => t.id));

                newTasks = newTasks.map(t => {
                  if (toPullIds.has(t.id)) {
                    return { ...t, startSprint: sprintNumber, endSprint: sprintNumber };
                  }
                  return t;
                });
              }
            }
          }
        }

        set({ sprintCapacities: newCapacities, tasks: newTasks });

        if (hasSupabase) {
          const wsId = get()._loadedWorkspaceId ?? undefined;
          const finalCap = newCapacities[sprintNumber] ?? { ...DEFAULT_CAPACITY };
          upsertSprintCapacity(sprintNumber, finalCap.dev, finalCap.ux, wsId).catch((err) => {
            console.error('[roadmapStore] setCapacity persist failed:', err);
          });
          // Also persist any cascaded task moves
          newTasks.forEach(t => {
            const original = state.tasks.find(o => o.id === t.id);
            if (original && (original.startSprint !== t.startSprint || original.endSprint !== t.endSprint)) {
              patchRoadmapTask(t.id, { startSprint: t.startSprint, endSprint: t.endSprint }).catch((err) => {
                console.error('[roadmapStore] cascade move persist failed:', err);
              });
            }
          });
        }
      },

      undo: () => {
        const { _undoStack } = get();
        if (_undoStack.length === 0) return null;
        const snapshot = _undoStack[_undoStack.length - 1];
        set({
          tasks: snapshot.tasks,
          sprintCapacities: snapshot.sprintCapacities,
          _undoStack: _undoStack.slice(0, -1),
        });
        return snapshot.label;
      },

      canUndo: () => get()._undoStack.length > 0,

      getUndoLabel: () => {
        const { _undoStack } = get();
        if (_undoStack.length === 0) return null;
        return _undoStack[_undoStack.length - 1].label;
      },
    };
    },
    {
      name: 'northstar-roadmap',
      version: 5,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          return { ...state, sprintCapacities: {}, _undoStack: [] };
        }
        if (version < 3) {
          return { ...state, _undoStack: [] };
        }
        if (version < 5) {
          // v5: Force re-seed with corrected roadmap data.
          if (typeof window !== 'undefined') {
            localStorage.removeItem('northstar-roadmap-seeded');
          }
          return { ...state, tasks: [], _undoStack: [] };
        }
        return state;
      },
      // Don't persist the undo stack — it's session-only
      partialize: (state: RoadmapState) => {
        const { _undoStack, ...rest } = state;
        return rest;
      },
    }
  )
);
