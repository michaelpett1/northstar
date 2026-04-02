'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { VisionBanner } from './VisionBanner';
import { ToastContainer } from '@/components/ui/Toast';
import { useDataInit } from '@/lib/hooks/useDataInit';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useAuthStore } from '@/lib/store/authStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { initialize, isInitialized, isLoading, user, workspaces, currentWorkspace } = useAuthStore();
  const skipAuth = true; // TODO: restore when Supabase is configured
  // const skipAuth = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Initialize auth on mount (only if Supabase is configured)
  useEffect(() => {
    if (skipAuth) return;
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize, skipAuth]);

  // Redirect based on auth/workspace state (only if Supabase is configured)
  useEffect(() => {
    if (skipAuth) return;
    if (!isInitialized || isLoading) return;

    if (!user) {
      router.push('/sign-in');
      return;
    }

    if (workspaces.length === 0 || !currentWorkspace) {
      router.push('/onboarding');
      return;
    }
  }, [isInitialized, isLoading, user, workspaces, currentWorkspace, router, skipAuth]);

  useDataInit();

  const theme = useSettingsStore((s) => s.theme);
  const accentColor = useSettingsStore((s) => s.accentColor);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.dataset.theme = 'dark';
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = prefersDark ? 'dark' : 'light';
    } else {
      root.dataset.theme = 'light';
    }
  }, [theme]);

  // Apply accent color as CSS variable
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-accent', accentColor);
    root.style.setProperty('--app-accent-hover', accentColor);
    root.style.setProperty('--app-accent-subtle', `${accentColor}10`);
  }, [accentColor]);

  // Show loading while auth initializes (only when Supabase is configured)
  // Only block on initialization/loading — redirect handles missing user/workspace
  if (!skipAuth && (!isInitialized || isLoading)) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={28} className="animate-spin" style={{ color: '#2563EB', marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden dm-canvas" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <VisionBanner />
        <main className="flex-1 overflow-auto dm-canvas ambient-bg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
