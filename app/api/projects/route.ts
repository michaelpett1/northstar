import { NextResponse } from 'next/server';
import { createAPIClient } from '@/lib/supabase/api-client';
import type { Database } from '@/lib/supabase/types';

type DBTimelineItem = Database['public']['Tables']['timeline_items']['Row'];

/**
 * GET /api/projects
 *
 * Returns all timeline items (projects, milestones, tasks) with their groups.
 * Supports optional ?workspace_id= and ?status= query params.
 *
 * Used by PM Command Centre to pull live roadmap/project data.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');

    const sb = createAPIClient();

    // Fetch items and groups in parallel
    let itemsQ = sb
      .from('timeline_items')
      .select('*')
      .order('created_at', { ascending: true });

    let groupsQ = sb
      .from('timeline_groups')
      .select('*')
      .order('sort_order');

    // Fetch team members for owner name resolution
    let membersQ = sb.from('team_members').select('id, name').order('name');

    if (workspaceId) {
      itemsQ = itemsQ.eq('workspace_id', workspaceId);
      groupsQ = groupsQ.eq('workspace_id', workspaceId);
      membersQ = membersQ.eq('workspace_id', workspaceId);
    }

    if (status) {
      itemsQ = itemsQ.eq('status', status as DBTimelineItem['status']);
    }

    const [itemsRes, groupsRes, membersRes] = await Promise.all([
      itemsQ,
      groupsQ,
      membersQ,
    ]);

    if (itemsRes.error) throw itemsRes.error;
    if (groupsRes.error) throw groupsRes.error;
    if (membersRes.error) throw membersRes.error;

    const items = (itemsRes.data ?? []) as unknown as DBTimelineItem[];
    const groups = (groupsRes.data ?? []) as Record<string, unknown>[];
    const members = (membersRes.data ?? []) as { id: string; name: string }[];

    // Build a lookup for owner names
    const memberMap = new Map(members.map((m) => [m.id, m.name]));

    // Enrich items with owner name and group name
    const enrichedItems = items.map((item) => ({
      ...item,
      owner_name: memberMap.get(item.owner_id ?? '') ?? null,
      group_name:
        groups.find((g) => g.id === (item as Record<string, unknown>).group_id)
          ?.name ?? null,
    }));

    // Summary stats
    const summary = {
      total: items.length,
      not_started: items.filter((i) => i.status === 'not_started').length,
      in_progress: items.filter((i) => i.status === 'in_progress').length,
      at_risk: items.filter((i) => i.status === 'at_risk').length,
      complete: items.filter((i) => i.status === 'complete').length,
      avg_progress: items.length
        ? Math.round(
            items.reduce((sum, i) => sum + i.progress, 0) / items.length
          )
        : 0,
    };

    return NextResponse.json(
      {
        ok: true,
        summary,
        groups,
        items: enrichedItems,
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
    console.error('[api/projects] GET failed:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch projects', detail: message },
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
