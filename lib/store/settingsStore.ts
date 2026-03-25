'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, Theme, TeamMember } from '@/lib/types';
import { TEAM_MEMBERS } from '@/lib/data/mockData';
import { fetchTeamMembers } from '@/lib/supabase/queries';

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

interface SettingsState extends AppSettings {
  teamMembers: TeamMember[];
  isLoadingTeam: boolean;
  loadTeamMembers: () => Promise<void>;
  updateTheme: (theme: Theme) => void;
  updateAccentColor: (color: string) => void;
  toggleSidebarCompact: () => void;
  updateProfile: (patch: Partial<AppSettings['profile']>) => void;
  updateWorkspace: (patch: Partial<AppSettings['workspace']>) => void;
  addTeamMember: (member: TeamMember) => void;
  removeTeamMember: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      accentColor: '#3B82F6',
      sidebarCompact: false,
      profile: {
        name: 'Alex Rivera',
        email: 'alex@northstar.io',
        avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Rivera&background=3B82F6&color=fff&size=40',
        role: 'Product Lead',
      },
      workspace: {
        name: 'Northstar HQ',
        defaultOKRPeriod: '2026-Q2',
        defaultTimelineView: 'gantt',
      },
      teamMembers: TEAM_MEMBERS,
      isLoadingTeam: false,

      loadTeamMembers: async () => {
        if (!hasSupabase) return;
        set({ isLoadingTeam: true });
        try {
          const teamMembers = await fetchTeamMembers();
          if (teamMembers.length > 0) set({ teamMembers });
        } catch (err) {
          console.error('[settingsStore] loadTeamMembers failed:', err);
        } finally {
          set({ isLoadingTeam: false });
        }
      },

      updateTheme: (theme) => set({ theme }),
      updateAccentColor: (accentColor) => set({ accentColor }),
      toggleSidebarCompact: () => set((s) => ({ sidebarCompact: !s.sidebarCompact })),
      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      updateWorkspace: (patch) => set((s) => ({ workspace: { ...s.workspace, ...patch } })),
      addTeamMember: (member) => set((s) => ({ teamMembers: [...s.teamMembers, member] })),
      removeTeamMember: (id) => set((s) => ({ teamMembers: s.teamMembers.filter((m) => m.id !== id) })),
    }),
    { name: 'northstar-settings' }
  )
);
