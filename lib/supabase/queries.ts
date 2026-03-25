// All Supabase data-access functions live here.
// Components and stores call these — they never import the client directly.

import { createClient } from './client';
import type { TimelineItem, Objective, KeyResult, CheckIn, TeamMember, ActivityEvent } from '@/lib/types';
import type { Database } from './types';

type DBTimeline  = Database['public']['Tables']['timeline_items']['Row'];
type DBObjective = Database['public']['Tables']['objectives']['Row'];
type DBKR        = Database['public']['Tables']['key_results']['Row'];
type DBCheckIn   = Database['public']['Tables']['check_ins']['Row'];
type DBTeamMember = Database['public']['Tables']['team_members']['Row'];
type DBActivity  = Database['public']['Tables']['activity_events']['Row'];

// ── Mappers: snake_case DB → camelCase app ────────────────────────────────────

function mapItem(row: DBTimeline): TimelineItem {
  return {
    id:           row.id,
    title:        row.title,
    description:  row.description,
    type:         row.type,
    parentId:     row.parent_id,
    status:       row.status,
    priority:     row.priority,
    ownerId:      row.owner_id ?? '',
    startDate:    row.start_date,
    endDate:      row.end_date,
    progress:     row.progress,
    dependencies: row.dependencies,
    tags:         row.tags,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

function mapKR(row: DBKR, checkIns: CheckIn[]): KeyResult {
  return {
    id:             row.id,
    objectiveId:    row.objective_id,
    title:          row.title,
    ownerId:        row.owner_id ?? '',
    metricType:     row.metric_type,
    startValue:     row.start_value,
    currentValue:   row.current_value,
    targetValue:    row.target_value,
    confidence:     row.confidence,
    checkIns,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

function mapObjective(row: DBObjective, keyResults: KeyResult[]): Objective {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    ownerId:     row.owner_id ?? '',
    period:      row.period,
    status:      row.status,
    keyResults,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ── Timeline items ────────────────────────────────────────────────────────────

export async function fetchTimelineItems(): Promise<TimelineItem[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('timeline_items')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as DBTimeline[]).map(mapItem);
}

export async function upsertTimelineItem(item: Partial<TimelineItem> & { id: string }): Promise<void> {
  const sb = createClient();
  const payload: Database['public']['Tables']['timeline_items']['Insert'] = {
    id:           item.id,
    title:        item.title ?? '',
    description:  item.description ?? '',
    type:         item.type ?? 'task',
    parent_id:    item.parentId ?? null,
    status:       item.status ?? 'not_started',
    priority:     item.priority ?? 'p2',
    owner_id:     item.ownerId ?? null,
    start_date:   item.startDate ?? new Date().toISOString().split('T')[0],
    end_date:     item.endDate ?? new Date().toISOString().split('T')[0],
    progress:     item.progress ?? 0,
    dependencies: item.dependencies ?? [],
    tags:         item.tags ?? [],
  };
  const { error } = await sb.from('timeline_items').upsert(payload as never);
  if (error) throw error;
}

export async function patchTimelineItem(id: string, patch: Partial<TimelineItem>): Promise<void> {
  const sb = createClient();
  const dbPatch: Partial<Database['public']['Tables']['timeline_items']['Update']> = {};
  if (patch.title       !== undefined) dbPatch.title       = patch.title;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.status      !== undefined) dbPatch.status      = patch.status;
  if (patch.priority    !== undefined) dbPatch.priority    = patch.priority;
  if (patch.progress    !== undefined) dbPatch.progress    = patch.progress;
  if (patch.ownerId     !== undefined) dbPatch.owner_id    = patch.ownerId;
  if (patch.startDate   !== undefined) dbPatch.start_date  = patch.startDate;
  if (patch.endDate     !== undefined) dbPatch.end_date    = patch.endDate;
  if (patch.tags        !== undefined) dbPatch.tags        = patch.tags;
  const { error } = await sb.from('timeline_items').update(dbPatch as never).eq('id', id);
  if (error) throw error;
}

// ── Team members ──────────────────────────────────────────────────────────────

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const sb = createClient();
  const { data, error } = await sb.from('team_members').select('*').order('name');
  if (error) throw error;
  return ((data ?? []) as unknown as DBTeamMember[]).map(row => ({
    id:        row.id,
    name:      row.name,
    email:     row.email,
    avatarUrl: row.avatar_url,
    role:      row.role,
  }));
}

// ── Objectives + KRs (nested fetch) ──────────────────────────────────────────

export async function fetchObjectives(): Promise<Objective[]> {
  const sb = createClient();

  // Fetch everything in parallel
  const [objRes, krRes, ciRes] = await Promise.all([
    sb.from('objectives').select('*').order('created_at'),
    sb.from('key_results').select('*').order('created_at'),
    sb.from('check_ins').select('*').order('created_at'),
  ]);

  if (objRes.error) throw objRes.error;
  if (krRes.error)  throw krRes.error;
  if (ciRes.error)  throw ciRes.error;

  const ciRows = (ciRes.data ?? []) as unknown as DBCheckIn[];
  const krRows = (krRes.data ?? []) as unknown as DBKR[];
  const objRows = (objRes.data ?? []) as unknown as DBObjective[];

  const checkInsMap = new Map<string, CheckIn[]>();
  ciRows.forEach(ci => {
    const list = checkInsMap.get(ci.key_result_id) ?? [];
    list.push({ id: ci.id, value: ci.value, note: ci.note, createdAt: ci.created_at });
    checkInsMap.set(ci.key_result_id, list);
  });

  const krByObjective = new Map<string, KeyResult[]>();
  krRows.forEach(kr => {
    const list = krByObjective.get(kr.objective_id) ?? [];
    list.push(mapKR(kr, checkInsMap.get(kr.id) ?? []));
    krByObjective.set(kr.objective_id, list);
  });

  return objRows.map(obj => mapObjective(obj, krByObjective.get(obj.id) ?? []));
}

export async function addCheckIn(
  objectiveId: string,
  krId: string,
  checkIn: { value: number; note: string }
): Promise<CheckIn> {
  const sb = createClient();
  // Update current_value on key_result
  await sb.from('key_results').update({ current_value: checkIn.value } as never).eq('id', krId);
  // Insert check-in
  const payload: Database['public']['Tables']['check_ins']['Insert'] = {
    key_result_id: krId,
    value: checkIn.value,
    note: checkIn.note,
  };
  const { data, error } = await sb
    .from('check_ins')
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  const row = data as unknown as DBCheckIn;
  return { id: row.id, value: row.value, note: row.note, createdAt: row.created_at };
}

export async function patchKeyResult(
  krId: string,
  patch: { confidence?: string; current_value?: number }
): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('key_results').update(patch as never).eq('id', krId);
  if (error) throw error;
}

// ── Activity events ───────────────────────────────────────────────────────────

export async function fetchActivityEvents(): Promise<ActivityEvent[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('activity_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as unknown as DBActivity[]).map(row => ({
    id:        row.id,
    text:      row.text,
    timestamp: row.created_at,
    type:      row.type,
  }));
}
