'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, Theme, TeamMember, Department } from '@/lib/types';
import {
  fetchTeamMembers,
  fetchDepartments,
  upsertDepartment as dbUpsertDepartment,
  deleteDepartment as dbDeleteDepartment,
  upsertTeamMember as dbUpsertTeamMember,
  patchTeamMember as dbPatchTeamMember,
  deleteTeamMember as dbDeleteTeamMember,
  fetchWorkspaceSettings,
  upsertWorkspaceSettings as dbUpsertWorkspaceSettings,
} from '@/lib/supabase/queries';
import { TEAM_MEMBERS } from '@/lib/data/mockData';

const hasSupabase = false; // TODO: restore when Supabase is configured
// const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'GDC Product Led Growth', color: '#22C55E', password: 'PLG2026!' },
  { id: 'dept-2', name: 'Design', color: '#F97316', password: 'Design2026!' },
  { id: 'dept-3', name: 'Web Analysts', color: '#3B82F6', password: 'Analytics2026!' },
];

interface SettingsState extends AppSettings {
  teamMembers: TeamMember[];
  departments: Department[];
  isLoadingTeam: boolean;
  visionCollapsed: boolean;
  _loadedWorkspaceId: string | null;
  loadTeamMembers: (workspaceId?: string) => Promise<void>;
  updateTheme: (theme: Theme) => void;
  updateAccentColor: (color: string) => void;
  toggleSidebarCompact: () => void;
  updateProfile: (patch: Partial<AppSettings['profile']>) => void;
  updateWorkspace: (patch: Partial<AppSettings['workspace']>) => void;
  addTeamMember: (member: TeamMember) => void;
  updateTeamMember: (id: string, patch: Partial<TeamMember>) => void;
  removeTeamMember: (id: string) => void;
  seedDepartmentsIfEmpty: (workspaceId: string) => void;
  addDepartment: (dept: Department) => void;
  updateDepartment: (id: string, patch: Partial<Department>) => void;
  removeDepartment: (id: string) => void;
  setVisionCollapsed: (collapsed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      accentColor: '#2563EB',
      sidebarCompact: false,
      visionCollapsed: false,
      profile: {
        name: '',
        email: '',
        avatarUrl: '',
        role: '',
      },
      workspace: {
        name: '',
        vision: '',
        defaultOKRPeriod: '2026-Q2',
        defaultTimelineView: 'gantt',
        defaultGanttScale: 'week',
        okrPasswordProtection: true,
      },
      teamMembers: [],
      departments: [],
      isLoadingTeam: false,
      _loadedWorkspaceId: null,

      loadTeamMembers: async (workspaceId?: string) => {
        const prevWsId = useSettingsStore.getState()._loadedWorkspaceId;
        const wsId = workspaceId ?? null;

        // Workspace changed — reset team members for the new workspace
        if (prevWsId !== wsId) {
          if (wsId === 'ws-gdc-product-features') {
            // GDC workspace: seed once, flag prevents re-seeding after user edits
            const seeded = typeof window !== 'undefined' && localStorage.getItem('northstar-team-seeded');
            if (!seeded) {
              set({ teamMembers: TEAM_MEMBERS, _loadedWorkspaceId: wsId });
              if (typeof window !== 'undefined') localStorage.setItem('northstar-team-seeded', '1');
            } else {
              // Already seeded before — but members may have been cleared by workspace switch
              const current = useSettingsStore.getState().teamMembers;
              if (current.length === 0) {
                set({ teamMembers: TEAM_MEMBERS, _loadedWorkspaceId: wsId });
              } else {
                set({ _loadedWorkspaceId: wsId });
              }
            }
          } else {
            const current = useSettingsStore.getState().teamMembers;
            if (current.length > 0 && prevWsId === null) {
              // First load after rehydration — keep members (e.g. creator just added during onboarding)
              set({ _loadedWorkspaceId: wsId });
            } else if (prevWsId !== null) {
              // Actively switching from another workspace — clear old members
              set({ teamMembers: [], _loadedWorkspaceId: wsId });
            } else {
              set({ _loadedWorkspaceId: wsId });
            }
          }
        }

        if (!hasSupabase) {
          // Deduplicate by email AND by id (fixes stale duplicates from earlier bugs)
          const current = useSettingsStore.getState().teamMembers;
          if (current.length > 0) {
            const seenEmails = new Set<string>();
            const seenIds = new Set<string>();
            const deduped = current.filter(m => {
              const emailKey = m.email.toLowerCase();
              if (seenEmails.has(emailKey) || seenIds.has(m.id)) return false;
              seenEmails.add(emailKey);
              seenIds.add(m.id);
              return true;
            });
            if (deduped.length !== current.length) {
              set({ teamMembers: deduped });
            }
          }
          return;
        }
        set({ isLoadingTeam: true });
        try {
          const [teamMembers, wsSettings] = await Promise.all([
            fetchTeamMembers(workspaceId),
            workspaceId ? fetchWorkspaceSettings(workspaceId) : Promise.resolve(null),
          ]);
          if (teamMembers.length > 0) set({ teamMembers });
          if (wsSettings) {
            set({
              workspace: {
                name: (wsSettings.name as string) || useSettingsStore.getState().workspace.name,
                vision: (wsSettings.vision as string) ?? '',
                defaultOKRPeriod: (wsSettings.default_okr_period as string) ?? '2026-Q1',
                defaultTimelineView: ((wsSettings.default_timeline_view as string) ?? 'gantt') as AppSettings['workspace']['defaultTimelineView'],
                defaultGanttScale: ((wsSettings.default_gantt_scale as string) ?? 'week') as AppSettings['workspace']['defaultGanttScale'],
                okrPasswordProtection: wsSettings.okr_password_protection !== false,
              },
            });
          }
        } catch (err) {
          console.error('[settingsStore] loadTeamMembers failed:', err);
        } finally {
          set({ isLoadingTeam: false });
        }
      },

      updateTheme: (theme) => set({ theme }),
      updateAccentColor: (accentColor) => set({ accentColor }),
      toggleSidebarCompact: () => set((s) => ({ sidebarCompact: !s.sidebarCompact })),

      updateProfile: (patch) =>
        set((s) => {
          const newProfile = { ...s.profile, ...patch };
          // Update profile only — do NOT sync to teamMembers.
          // Team members are managed separately and should never be
          // overwritten by the active profile (prevents user-switching bugs).
          return { profile: newProfile };
        }),

      updateWorkspace: (patch) => {
        set((s) => ({ workspace: { ...s.workspace, ...patch } }));
        if (hasSupabase) {
          const wsId = useSettingsStore.getState()._loadedWorkspaceId;
          if (wsId) {
            dbUpsertWorkspaceSettings(wsId, patch).catch((err) => {
              console.error('[settingsStore] updateWorkspace persist failed:', err);
            });
          }
        }
      },

      addTeamMember: (member) => {
        const state = useSettingsStore.getState();
        // Prevent duplicates by email
        const exists = state.teamMembers.some(m => m.email.toLowerCase() === member.email.toLowerCase());
        if (exists) return;
        set({ teamMembers: [...state.teamMembers, member] });
        if (hasSupabase) {
          const wsId = state._loadedWorkspaceId ?? undefined;
          dbUpsertTeamMember(member, wsId).catch((err) => {
            console.error('[settingsStore] addTeamMember persist failed:', err);
          });
        }
      },

      updateTeamMember: (id, patch) => {
        set((s) => ({
          teamMembers: s.teamMembers.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        }));
        if (hasSupabase) {
          dbPatchTeamMember(id, patch).catch((err) => {
            console.error('[settingsStore] updateTeamMember persist failed:', err);
          });
        }
      },

      removeTeamMember: (id) => {
        set((s) => ({ teamMembers: s.teamMembers.filter((m) => m.id !== id) }));
        if (hasSupabase) {
          dbDeleteTeamMember(id).catch((err) => {
            console.error('[settingsStore] removeTeamMember persist failed:', err);
          });
        }
      },

      seedDepartmentsIfEmpty: async (workspaceId: string) => {
        // In Supabase mode, load from DB
        if (hasSupabase) {
          try {
            const departments = await fetchDepartments(workspaceId);
            if (departments.length > 0) set({ departments });
          } catch (err) {
            console.error('[settingsStore] fetchDepartments failed:', err);
          }
          return;
        }
        if (typeof window === 'undefined') return;
        if (workspaceId === 'ws-gdc-product-features') {
          // Only seed if this browser has never been seeded (permanent flag)
          const gdcSeeded = localStorage.getItem('northstar-gdc-initial-seed-v3');
          const currentDepts = useSettingsStore.getState().departments;
          if (currentDepts.length === 0 && !gdcSeeded) {
            set({ departments: DEFAULT_DEPARTMENTS });
          }
        }
      },

      addDepartment: (dept) => {
        set((s) => ({ departments: [...s.departments, dept] }));
        if (hasSupabase) {
          const wsId = useSettingsStore.getState()._loadedWorkspaceId ?? undefined;
          dbUpsertDepartment(dept, wsId).catch((err) => {
            console.error('[settingsStore] addDepartment persist failed:', err);
          });
        }
      },
      updateDepartment: (id, patch) => {
        set((s) => ({
          departments: s.departments.map((d) => d.id === id ? { ...d, ...patch } : d),
        }));
        if (hasSupabase) {
          const updated = useSettingsStore.getState().departments.find(d => d.id === id);
          if (updated) {
            const wsId = useSettingsStore.getState()._loadedWorkspaceId ?? undefined;
            dbUpsertDepartment(updated, wsId).catch((err) => {
              console.error('[settingsStore] updateDepartment persist failed:', err);
            });
          }
        }
      },
      removeDepartment: (id) => {
        set((s) => ({ departments: s.departments.filter((d) => d.id !== id) }));
        if (hasSupabase) {
          dbDeleteDepartment(id).catch((err) => {
            console.error('[settingsStore] removeDepartment persist failed:', err);
          });
        }
      },
      setVisionCollapsed: (collapsed) => set({ visionCollapsed: collapsed }),
    }),
    {
      name: 'northstar-settings',
      version: 11,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 5) {
          return {
            ...state,
            teamMembers: [],
            departments: [],
            visionCollapsed: false,
            profile: { name: '', email: '', avatarUrl: '', role: '' },
            workspace: { name: '', vision: '', defaultOKRPeriod: '2026-Q1', defaultTimelineView: 'gantt', defaultGanttScale: 'week' },
          };
        }
        if (version < 8) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('northstar-team-seeded');
          }
          return {
            ...state,
            teamMembers: [],
          };
        }
        if (version < 11) {
          // v11: Departments start empty — GDC workspace gets seeded via seedDepartmentsIfEmpty
          return {
            ...state,
            departments: [],
          };
        }
        return state;
      },
    }
  )
);
