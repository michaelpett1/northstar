import { NextResponse } from 'next/server';
import { createAPIClient } from '@/lib/supabase/api-client';
import type { Database } from '@/lib/supabase/types';

type DBObjective = Database['public']['Tables']['objectives']['Row'];
type DBKR = Database['public']['Tables']['key_results']['Row'];
type DBCheckIn = Database['public']['Tables']['check_ins']['Row'];

/**
 * GET /api/okrs
 *
 * Returns all objectives with nested key results and check-ins.
 * Supports optional ?workspace_id= query param.
 *
 * Used by PM Command Centre to pull live OKR data.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    const sb = createAPIClient();

    // Fetch objectives, key results, and check-ins in parallel
    let objQ = sb.from('objectives').select('*').order('created_at');
    let krQ = sb.from('key_results').select('*').order('created_at');
    let ciQ = sb.from('check_ins').select('*').order('created_at');

    if (workspaceId) {
      objQ = objQ.eq('workspace_id', workspaceId);
      krQ = krQ.eq('workspace_id', workspaceId);
      ciQ = ciQ.eq('workspace_id', workspaceId);
    }

    const [objRes, krRes, ciRes] = await Promise.all([objQ, krQ, ciQ]);

    if (objRes.error) throw objRes.error;
    if (krRes.error) throw krRes.error;
    if (ciRes.error) throw ciRes.error;

    const checkIns = (ciRes.data ?? []) as unknown as DBCheckIn[];
    const keyResults = (krRes.data ?? []) as unknown as DBKR[];
    const objectives = (objRes.data ?? []) as unknown as DBObjective[];

    // Group check-ins by key_result_id
    const ciByKR = new Map<string, DBCheckIn[]>();
    checkIns.forEach((ci) => {
      const list = ciByKR.get(ci.key_result_id) ?? [];
      list.push(ci);
      ciByKR.set(ci.key_result_id, list);
    });

    // Group key results by objective_id, attach check-ins
    const krByObj = new Map<string, (DBKR & { check_ins: DBCheckIn[] })[]>();
    keyResults.forEach((kr) => {
      const list = krByObj.get(kr.objective_id) ?? [];
      list.push({ ...kr, check_ins: ciByKR.get(kr.id) ?? [] });
      krByObj.set(kr.objective_id, list);
    });

    // Nest key results into objectives
    const result = objectives.map((obj) => ({
      ...obj,
      key_results: krByObj.get(obj.id) ?? [],
    }));

    return NextResponse.json(
      { ok: true, count: result.length, objectives: result },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (err) {
    console.error('[api/okrs] GET failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch OKRs' },
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
