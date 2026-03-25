'use client';
import { useEffect, useRef } from 'react';
import { useProjectsStore } from '@/lib/store/projectsStore';
import { useOKRsStore } from '@/lib/store/okrsStore';
import { useSettingsStore } from '@/lib/store/settingsStore';

/**
 * Call once at the app shell level. Loads all remote data on mount.
 * Falls back silently to mock data when Supabase env vars are absent.
 */
export function useDataInit() {
  const initialized = useRef(false);
  const loadProjects = useProjectsStore((s) => s.load);
  const loadOKRs = useOKRsStore((s) => s.load);
  const loadTeam = useSettingsStore((s) => s.loadTeamMembers);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Promise.all([loadProjects(), loadOKRs(), loadTeam()]).catch(() => {
      // Errors are logged per-store; app degrades to mock data gracefully
    });
  }, [loadProjects, loadOKRs, loadTeam]);
}
