'use client';
import { useEffect, useRef } from 'react';
import { useProjectsStore } from '@/lib/store/projectsStore';
import { useOKRsStore } from '@/lib/store/okrsStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useRoadmapStore } from '@/lib/store/roadmapStore';
import { useSuggestionsStore } from '@/lib/store/suggestionsStore';
import { useActivityStore } from '@/lib/store/activityStore';
import { TIMELINE_ITEMS, OBJECTIVES, GDC_SEED_ROADMAP_TASKS, TEAM_MEMBERS } from '@/lib/data/mockData';
import {
  upsertTimelineItem,
  upsertObjective,
  upsertKeyResult,
  upsertRoadmapTask,
  upsertTimelineGroup,
  upsertTeamMember,
  upsertDepartment,
  upsertRoadmapProject,
} from '@/lib/supabase/queries';

const hasSupabase = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GDC_WS_ID = 'ws-gdc-product-features';
const GDC_INITIAL_SEED_KEY = 'northstar-gdc-initial-seed-v3';
const GDC_SUPABASE_SYNC_KEY = 'northstar-gdc-supabase-synced-v3';

const DEFAULT_GROUPS = [
  { id: 'grp-1', name: 'New Features', color: '#2563EB' },
  { id: 'grp-2', name: 'Existing Product Improvements', color: '#22C55E' },
  { id: 'grp-3', name: 'Hygiene Improvements', color: '#EC4899' },
  { id: 'grp-4', name: 'Free to Play', color: '#F59E0B' },
];

/**
 * One-time seed for the GDC demo workspace.
 * Only runs if this browser has NEVER been seeded before.
 * The flag is never cleared by onboarding or workspace switching.
 */
function seedGDCOnce() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(GDC_INITIAL_SEED_KEY)) return;

  // Seed projects / timelines
  if (useProjectsStore.getState().items.length === 0) {
    useProjectsStore.setState({ items: TIMELINE_ITEMS, groups: DEFAULT_GROUPS });
  }

  // Seed OKRs
  if (useOKRsStore.getState().objectives.length === 0) {
    useOKRsStore.setState({ objectives: OBJECTIVES });
  }

  // Seed visual roadmap (normalise any legacy boolean priorities)
  if (useRoadmapStore.getState().tasks.length === 0) {
    useRoadmapStore.setState({
      tasks: GDC_SEED_ROADMAP_TASKS.map(t => ({
        ...t,
        priority: typeof t.priority === 'boolean'
          ? (t.priority ? 'p0' : 'p2')
          : (t.priority ?? 'p2'),
      })) as typeof GDC_SEED_ROADMAP_TASKS,
    });
  }

  // Mark as done — never re-seed
  localStorage.setItem(GDC_INITIAL_SEED_KEY, '1');

  // If Supabase is available, push seed data to the DB
  if (hasSupabase) {
    syncSeedToSupabase();
  }
}

/**
 * Push GDC seed data to Supabase so it persists server-side.
 * Runs once per browser (separate flag from the seed itself).
 */
async function syncSeedToSupabase() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(GDC_SUPABASE_SYNC_KEY)) return;

  try {
    // Always push the FULL seed constants — not whatever is in the store
    // This ensures all seed data makes it to Supabase even if the store
    // was partially loaded from a previous incomplete sync.

    // Push timeline items
    for (const item of TIMELINE_ITEMS) {
      await upsertTimelineItem(item, GDC_WS_ID).catch(() => {});
    }

    // Push objectives + key results from the constant
    for (const obj of OBJECTIVES) {
      await upsertObjective(obj, GDC_WS_ID).catch(() => {});
      for (const kr of obj.keyResults) {
        await upsertKeyResult(kr, GDC_WS_ID).catch(() => {});
      }
    }

    // Push roadmap tasks
    for (const task of GDC_SEED_ROADMAP_TASKS) {
      await upsertRoadmapTask(task, GDC_WS_ID).catch(() => {});
    }

    // Push timeline groups
    for (let i = 0; i < DEFAULT_GROUPS.length; i++) {
      await upsertTimelineGroup(DEFAULT_GROUPS[i], i, GDC_WS_ID).catch(() => {});
    }

    // Push team members
    for (const member of TEAM_MEMBERS) {
      await upsertTeamMember(member, GDC_WS_ID).catch(() => {});
    }

    // Push departments
    const DEFAULT_DEPARTMENTS = [
      { id: 'dept-1', name: 'GDC Product Led Growth', color: '#22C55E', password: 'PLG2026!' },
      { id: 'dept-2', name: 'Design', color: '#F97316', password: 'Design2026!' },
      { id: 'dept-3', name: 'Web Analysts', color: '#3B82F6', password: 'Analytics2026!' },
    ];
    for (const dept of DEFAULT_DEPARTMENTS) {
      await upsertDepartment(dept, GDC_WS_ID).catch(() => {});
    }

    // Push roadmap projects
    const ROADMAP_PROJECTS = ['Design Hygiene', 'Genesis', 'IUJs', 'Existing Product Enhancements', 'Existing Product Improvements', 'Hygiene Improvements', 'Promo Campaigns', 'New Features', 'Free to Play'];
    for (const name of ROADMAP_PROJECTS) {
      await upsertRoadmapProject(name, GDC_WS_ID).catch(() => {});
    }

    // Now refresh stores from Supabase to ensure state matches DB
    const objectives = await import('@/lib/supabase/queries').then(q => q.fetchObjectives(GDC_WS_ID));
    if (objectives.length > 0) {
      useOKRsStore.setState({ objectives });
    }
    const items = await import('@/lib/supabase/queries').then(q => q.fetchTimelineItems(GDC_WS_ID));
    if (items.length > 0) {
      useProjectsStore.setState({ items });
    }
    const tasks = await import('@/lib/supabase/queries').then(q => q.fetchRoadmapTasks(GDC_WS_ID));
    if (tasks.length > 0) {
      useRoadmapStore.setState({ tasks });
    }

    localStorage.setItem(GDC_SUPABASE_SYNC_KEY, '1');
    console.log('[useDataInit] GDC seed synced to Supabase');
  } catch (err) {
    console.error('[useDataInit] Supabase sync failed:', err);
  }
}

/**
 * Call once at the app shell level. Loads all remote data on mount.
 * Falls back silently to mock data when Supabase env vars are absent.
 * Scopes all queries to the current workspace.
 * Re-loads when workspace changes.
 */
export function useDataInit() {
  const currentWorkspaceId = useRef<string | null>(null);
  const loadProjects = useProjectsStore((s) => s.load);
  const loadOKRs = useOKRsStore((s) => s.load);
  const loadTeam = useSettingsStore((s) => s.loadTeamMembers);
  const seedDepts = useSettingsStore((s) => s.seedDepartmentsIfEmpty);
  const seedRoadmap = useRoadmapStore((s) => s.seedIfEmpty);
  const loadRoadmap = useRoadmapStore((s) => s.load);
  const loadSuggestions = useSuggestionsStore((s) => s.load);
  const loadActivity = useActivityStore((s) => s.load);
  const currentWorkspace = useAuthStore((s) => s.currentWorkspace);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const wsId = currentWorkspace?.id ?? null;

    // Skip if no workspace or if already initialized with same workspace
    if (!wsId) return;
    if (currentWorkspaceId.current === wsId) return;

    currentWorkspaceId.current = wsId;

    Promise.all([
      loadProjects(wsId),
      loadOKRs(wsId),
      loadTeam(wsId),
      loadRoadmap(wsId),
      loadSuggestions(wsId),
      loadActivity(wsId),
    ]).then(() => {
      // One-time GDC demo seed (only on very first app use, never again)
      if (wsId === GDC_WS_ID) {
        seedGDCOnce();
        // Also sync existing seed data to Supabase if not done yet
        if (hasSupabase && !localStorage.getItem(GDC_SUPABASE_SYNC_KEY)) {
          syncSeedToSupabase();
        }
      }

      // Seed workspace-specific data for known workspaces if empty
      seedRoadmap(wsId);
      seedDepts(wsId);

      // Ensure the current user is always in the team members list as owner
      // (handles new workspaces where the creator must appear)
      if (user?.email) {
        const settings = useSettingsStore.getState();
        const alreadyExists = settings.teamMembers.some(
          m => m.email.toLowerCase() === user.email!.toLowerCase()
        );
        if (!alreadyExists) {
          const userName = (user as unknown as Record<string, Record<string, string>>).user_metadata?.full_name ?? user.email.split('@')[0];
          const isCreator = currentWorkspace?.createdBy === user.id;
          settings.addTeamMember({
            id: user.id,
            name: userName,
            email: user.email,
            role: isCreator ? 'Workspace Creator' : 'Member',
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2563EB&color=fff&size=40`,
            workspaceRole: isCreator ? 'owner' : 'member',
          });
        }
      }
    }).catch(() => {
      // Errors are logged per-store; app degrades to mock data gracefully
    });
  }, [loadProjects, loadOKRs, loadTeam, seedDepts, seedRoadmap, loadRoadmap, loadSuggestions, loadActivity, currentWorkspace, user]);
}
