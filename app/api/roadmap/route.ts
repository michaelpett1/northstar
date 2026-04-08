import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/roadmap
 *
 * Returns roadmap tasks (sprint-level dev/ux work items) with sprint data.
 * Supports optional ?workspace_id= query param.
 *
 * Used by PM Command Centre to pull live visual roadmap data.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    const sb = await createServerSupabaseClient();

    // Fetch roadmap tasks, team members, and sprint capacities
    let tasksQ = sb
      .from('roadmap_tasks')
      .select('*')
      .order('created_at', { ascending: true });

    let membersQ = sb.from('team_members').select('id, name').order('name');

    let capacitiesQ = sb.from('sprint_capacities').select('*');

    // Also fetch roadmap project names
    let projectsQ = sb.from('roadmap_projects').select('name').order('name');

    if (workspaceId) {
      tasksQ = tasksQ.eq('workspace_id', workspaceId);
      membersQ = membersQ.eq('workspace_id', workspaceId);
      capacitiesQ = capacitiesQ.eq('workspace_id', workspaceId);
      projectsQ = projectsQ.eq('workspace_id', workspaceId);
    }

    const [tasksRes, membersRes, capacitiesRes, projectsRes] =
      await Promise.all([tasksQ, membersQ, capacitiesQ, projectsQ]);

    if (tasksRes.error) throw tasksRes.error;
    if (membersRes.error) throw membersRes.error;
    if (capacitiesRes.error) throw capacitiesRes.error;
    if (projectsRes.error) throw projectsRes.error;

    const tasks = tasksRes.data ?? [];
    const members = membersRes.data ?? [];
    const capacities = capacitiesRes.data ?? [];
    const projects = (projectsRes.data ?? []).map(
      (p: Record<string, unknown>) => p.name as string
    );

    // Build lookups
    const memberMap = new Map(members.map((m) => [m.id, m.name]));

    const enrichedTasks = tasks.map((task: Record<string, unknown>) => ({
      ...task,
      assignee_name: memberMap.get(task.assignee_id as string) ?? null,
    }));

    // Sprint capacities as a map
    const sprintCapacities: Record<number, { dev: number; ux: number }> = {};
    capacities.forEach((row: Record<string, unknown>) => {
      sprintCapacities[row.sprint_number as number] = {
        dev: row.dev as number,
        ux: row.ux as number,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        count: tasks.length,
        projects,
        sprint_capacities: sprintCapacities,
        tasks: enrichedTasks,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (err) {
    console.error('[api/roadmap] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch roadmap' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
