'use client';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useDataInit } from '@/lib/hooks/useDataInit';

export function AppShell({ children }: { children: React.ReactNode }) {
  useDataInit();
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#FAFAF9' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-auto" style={{ backgroundColor: '#FAFAF9' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
