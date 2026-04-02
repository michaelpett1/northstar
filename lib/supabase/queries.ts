// All Supabase data-access functions live here.
// Components and stores call these — they never import the client directly.
// All queries are scoped by workspace_id.

import { createClient } from './client';
import type { TimelineItem, Objective, KeyResult, CheckIn, TeamMember, ActivityEvent, RoadmapTask, RoadmapSuggestion, Department } from '@/lib/types';
import type { Database } from './types';

type DBTimeline  = Database['public']['Tables']['timeline_items']['Row'];
type DBObjective = Database['public']['Tables']['objectives']['Row'];
type DBKR        = Database['public']['Tables']['key_results']['Row'];
type DBCheckIn   = Database['public']['Tables']['check_ins']['Row'];
type DBTeamMember = Database['public']['Tables']['team_members']['Row'];
type DBActivity  = Database['public']['Tables']['activity_events']['Row'];

import type { TimelineGroup, WorkspaceRole } from '@/lib/types';

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
    groupId:      (row as Record<string, unknown>).group_id as string ?? '',
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
    weight:         (row as Record<string, unknown>).weight as number ?? 0,
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
    periodType:  ((row as Record<string, unknown>).period_type as string ?? 'quarterly') as Objective['periodType'],
    department:  (row as Record<string, unknown>).department as string ?? '',
    isDraft:     (row as Record<string, unknown>).is_draft as boolean ?? false,
    status:      row.status,
    keyResults,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ── Timeline items ────────────────────────────────────────────────────────────

export async function fetchTimelineItems(workspaceId?: string): Promise<TimelineItem[]> {
  const sb = createClient();
  let query = sb
    .from('timeline_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as DBTimeline[]).map(mapItem);
}

export async function upsertTimelineItem(item: Partial<TimelineItem> & { id: string }, workspaceId?: string): Promise<void> {
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
    workspace_id: workspaceId ?? null,
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
  if (patch.tags            !== undefined) dbPatch.tags         = patch.tags;
  if (patch.groupId         !== undefined) (dbPatch as Record<string, unknown>).group_id = patch.groupId;
  if (patch.dependencies    !== undefined) dbPatch.dependencies = patch.dependencies;
  if ((patch as Record<string, unknown>).sortOrder !== undefined) (dbPatch as Record<string, unknown>).sort_order = (patch as Record<string, unknown>).sortOrder;
  const { error } = await sb.from('timeline_items').update(dbPatch as never).eq('id', id);
  if (error) throw error;
}

// ── Team members ──────────────────────────────────────────────────────────────

export async function fetchTeamMembers(workspaceId?: string): Promise<TeamMember[]> {
  const sb = createClient();
  let query = sb.from('team_members').select('*').order('name');
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as DBTeamMember[]).map(row => ({
    id:            row.id,
    name:          row.name,
    email:         row.email,
    avatarUrl:     row.avatar_url,
    role:          row.role,
    workspaceRole: (row as Record<string, unknown>).workspace_role as WorkspaceRole | undefined,
  }));
}

// ── Objectives + KRs (nested fetch) ──────────────────────────────────────────

export async function fetchObjectives(workspaceId?: string): Promise<Objective[]> {
  const sb = createClient();

  // Build queries with optional workspace scoping
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
  checkIn: { value: number; note: string },
  workspaceId?: string
): Promise<CheckIn> {
  const sb = createClient();
  // Update current_value on key_result
  await sb.from('key_results').update({ current_value: checkIn.value } as never).eq('id', krId);
  // Insert check-in
  const payload: Database['public']['Tables']['check_ins']['Insert'] = {
    key_result_id: krId,
    value: checkIn.value,
    note: checkIn.note,
    workspace_id: workspaceId ?? null,
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

export async function fetchActivityEvents(workspaceId?: string): Promise<ActivityEvent[]> {
  const sb = createClient();
  let query = sb
    .from('activity_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as DBActivity[]).map(row => ({
    id:        row.id,
    text:      row.text,
    timestamp: row.created_at,
    type:      row.type,
  }));
}

// ── Delete timeline item ─────────────────────────────────────────────────────

export async function deleteTimelineItem(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('timeline_items').delete().eq('id', id);
  if (error) throw error;
}

// ── Objectives CRUD ──────────────────────────────────────────────────────────

export async function upsertObjective(
  obj: Partial<Objective> & { id: string },
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    id:           obj.id,
    title:        obj.title ?? '',
    description:  obj.description ?? '',
    owner_id:     obj.ownerId ?? null,
    period:       obj.period ?? '',
    period_type:  obj.periodType ?? 'quarterly',
    department:   obj.department ?? '',
    is_draft:     obj.isDraft ?? false,
    status:       obj.status ?? 'on_track',
    workspace_id: workspaceId ?? null,
  };
  const { error } = await sb.from('objectives').upsert(payload as never);
  if (error) throw error;
}

export async function deleteObjective(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('objectives').delete().eq('id', id);
  if (error) throw error;
}

// ── Key Results CRUD ─────────────────────────────────────────────────────────

export async function upsertKeyResult(
  kr: Partial<KeyResult> & { id: string },
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    id:            kr.id,
    objective_id:  kr.objectiveId ?? '',
    title:         kr.title ?? '',
    owner_id:      kr.ownerId ?? null,
    metric_type:   kr.metricType ?? 'number',
    start_value:   kr.startValue ?? 0,
    current_value: kr.currentValue ?? 0,
    target_value:  kr.targetValue ?? 0,
    confidence:    kr.confidence ?? 'on_track',
    weight:        kr.weight ?? 0,
    workspace_id:  workspaceId ?? null,
  };
  const { error } = await sb.from('key_results').upsert(payload as never);
  if (error) throw error;
}

export async function deleteKeyResult(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('key_results').delete().eq('id', id);
  if (error) throw error;
}

// ── Roadmap tasks ────────────────────────────────────────────────────────────

export async function fetchRoadmapTasks(workspaceId?: string): Promise<RoadmapTask[]> {
  const sb = createClient();
  let query = sb
    .from('roadmap_tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(row => ({
    id:             row.id as string,
    title:          row.title as string,
    type:           row.type as RoadmapTask['type'],
    project:        row.project as string,
    jiraUrl:        row.jira_url as string,
    assigneeId:     row.assignee_id as string,
    startSprint:    row.start_sprint as number,
    endSprint:      row.end_sprint as number,
    priority:       row.priority as RoadmapTask['priority'],
    createdAt:      row.created_at as string,
    timelineItemId: (row.timeline_item_id as string) ?? undefined,
  }));
}

export async function upsertRoadmapTask(
  task: Partial<RoadmapTask> & { id: string },
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    id:               task.id,
    title:            task.title ?? '',
    type:             task.type ?? 'dev',
    project:          task.project ?? '',
    jira_url:         task.jiraUrl ?? '',
    assignee_id:      task.assigneeId ?? null,
    start_sprint:     task.startSprint ?? 0,
    end_sprint:       task.endSprint ?? 0,
    priority:         task.priority ?? false,
    timeline_item_id: task.timelineItemId ?? null,
    workspace_id:     workspaceId ?? null,
  };
  const { error } = await sb.from('roadmap_tasks').upsert(payload as never);
  if (error) throw error;
}

export async function deleteRoadmapTask(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('roadmap_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function patchRoadmapTask(
  id: string,
  patch: Partial<Pick<RoadmapTask, 'startSprint' | 'endSprint' | 'title' | 'priority' | 'assigneeId' | 'project'>>
): Promise<void> {
  const sb = createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.startSprint !== undefined) dbPatch.start_sprint = patch.startSprint;
  if (patch.endSprint   !== undefined) dbPatch.end_sprint   = patch.endSprint;
  if (patch.title       !== undefined) dbPatch.title        = patch.title;
  if (patch.priority    !== undefined) dbPatch.priority      = patch.priority;
  if (patch.assigneeId  !== undefined) dbPatch.assignee_id   = patch.assigneeId;
  if (patch.project     !== undefined) dbPatch.project       = patch.project;
  const { error } = await sb.from('roadmap_tasks').update(dbPatch as never).eq('id', id);
  if (error) throw error;
}

// ── Suggestions ──────────────────────────────────────────────────────────────

export async function fetchSuggestions(workspaceId?: string): Promise<RoadmapSuggestion[]> {
  const sb = createClient();
  let query = sb
    .from('suggestions')
    .select('*')
    .order('created_at', { ascending: false });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(row => ({
    id:                  row.id as string,
    title:               row.title as string,
    description:         row.description as string,
    source:              row.source as RoadmapSuggestion['source'],
    suggestedPriority:   row.suggested_priority as RoadmapSuggestion['suggestedPriority'],
    suggestedType:       row.suggested_type as RoadmapSuggestion['suggestedType'],
    suggestedGroupId:    row.suggested_group_id as string,
    relevanceScore:      row.relevance_score as number,
    duplicateOfId:       (row.duplicate_of_id as string) ?? null,
    duplicateConfidence: row.duplicate_confidence as number,
    status:              row.status as RoadmapSuggestion['status'],
    deferredUntil:       (row.deferred_until as string) ?? null,
    reviewedAt:          (row.reviewed_at as string) ?? null,
    scannedAt:           row.scanned_at as string,
    createdAt:           row.created_at as string,
    tags:                (row.tags as string[]) ?? [],
  }));
}

export async function upsertSuggestion(
  suggestion: Partial<RoadmapSuggestion> & { id: string },
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    id:                   suggestion.id,
    title:                suggestion.title ?? '',
    description:          suggestion.description ?? '',
    source:               suggestion.source ?? {},
    suggested_priority:   suggestion.suggestedPriority ?? 'p2',
    suggested_type:       suggestion.suggestedType ?? 'task',
    suggested_group_id:   suggestion.suggestedGroupId ?? '',
    relevance_score:      suggestion.relevanceScore ?? 0,
    duplicate_of_id:      suggestion.duplicateOfId ?? null,
    duplicate_confidence: suggestion.duplicateConfidence ?? 0,
    status:               suggestion.status ?? 'pending',
    deferred_until:       suggestion.deferredUntil ?? null,
    reviewed_at:          suggestion.reviewedAt ?? null,
    scanned_at:           suggestion.scannedAt ?? new Date().toISOString(),
    tags:                 suggestion.tags ?? [],
    workspace_id:         workspaceId ?? null,
  };
  const { error } = await sb.from('suggestions').upsert(payload as never);
  if (error) throw error;
}

export async function patchSuggestion(
  id: string,
  patch: Partial<Pick<RoadmapSuggestion, 'status' | 'reviewedAt' | 'deferredUntil'>>
): Promise<void> {
  const sb = createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.status        !== undefined) dbPatch.status         = patch.status;
  if (patch.reviewedAt    !== undefined) dbPatch.reviewed_at    = patch.reviewedAt;
  if (patch.deferredUntil !== undefined) dbPatch.deferred_until = patch.deferredUntil;
  const { error } = await sb.from('suggestions').update(dbPatch as never).eq('id', id);
  if (error) throw error;
}

// ── Departments ──────────────────────────────────────────────────────────────

export async function fetchDepartments(workspaceId?: string): Promise<Department[]> {
  const sb = createClient();
  let query = sb
    .from('departments')
    .select('*')
    .order('name');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(row => ({
    id:       row.id as string,
    name:     row.name as string,
    color:    row.color as string,
    password: (row.password as string) ?? undefined,
  }));
}

export async function upsertDepartment(
  dept: Partial<Department> & { id: string },
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    id:           dept.id,
    name:         dept.name ?? '',
    color:        dept.color ?? '#888888',
    password:     dept.password ?? null,
    workspace_id: workspaceId ?? null,
  };
  const { error } = await sb.from('departments').upsert(payload as never);
  if (error) throw error;
}

export async function deleteDepartment(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('departments').delete().eq('id', id);
  if (error) throw error;
}

// ── Insert activity event ────────────────────────────────────────────────────

export async function insertActivityEvent(
  text: string,
  type: ActivityEvent['type'],
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    text,
    type,
    workspace_id: workspaceId ?? null,
  };
  const { error } = await sb.from('activity_events').insert(payload as never);
  if (error) throw error;
}

// ── Sprint capacities ────────────────────────────────────────────────────────

export async function fetchSprintCapacities(
  workspaceId?: string
): Promise<Record<number, { dev: number; ux: number }>> {
  const sb = createClient();
  let query = sb.from('sprint_capacities').select('*');

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const result: Record<number, { dev: number; ux: number }> = {};
  ((data ?? []) as Record<string, unknown>[]).forEach(row => {
    result[row.sprint_number as number] = {
      dev: row.dev as number,
      ux:  row.ux as number,
    };
  });
  return result;
}

export async function upsertSprintCapacity(
  sprintNumber: number,
  dev: number,
  ux: number,
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    sprint_number: sprintNumber,
    dev,
    ux,
    workspace_id:  workspaceId ?? null,
  };
  const { error } = await sb
    .from('sprint_capacities')
    .upsert(payload as never, { onConflict: 'sprint_number,workspace_id' });
  if (error) throw error;
}

// ── Team members CRUD ───────────────────────────────────────────────────────

export async function upsertTeamMember(
  member: { id: string; name: string; email: string; avatarUrl: string; role: string; workspaceRole?: WorkspaceRole },
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    id:             member.id,
    name:           member.name,
    email:          member.email,
    avatar_url:     member.avatarUrl,
    role:           member.role,
    workspace_role: member.workspaceRole ?? 'member',
    workspace_id:   workspaceId ?? null,
  };
  const { error } = await sb.from('team_members').upsert(payload as never);
  if (error) throw error;
}

export async function patchTeamMember(
  id: string,
  patch: Partial<{ name: string; email: string; avatarUrl: string; role: string; workspaceRole: WorkspaceRole }>
): Promise<void> {
  const sb = createClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.name          !== undefined) dbPatch.name           = patch.name;
  if (patch.email         !== undefined) dbPatch.email          = patch.email;
  if (patch.avatarUrl     !== undefined) dbPatch.avatar_url     = patch.avatarUrl;
  if (patch.role          !== undefined) dbPatch.role           = patch.role;
  if (patch.workspaceRole !== undefined) dbPatch.workspace_role = patch.workspaceRole;
  const { error } = await sb.from('team_members').update(dbPatch as never).eq('id', id);
  if (error) throw error;
}

export async function deleteTeamMember(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('team_members').delete().eq('id', id);
  if (error) throw error;
}

// ── Timeline groups CRUD ────────────────────────────────────────────────────

export async function fetchTimelineGroups(workspaceId?: string): Promise<TimelineGroup[]> {
  const sb = createClient();
  let query = sb.from('timeline_groups').select('*').order('sort_order');
  if (workspaceId) query = query.eq('workspace_id', workspaceId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(row => ({
    id:    row.id as string,
    name:  row.name as string,
    color: row.color as string,
  }));
}

export async function upsertTimelineGroup(
  group: TimelineGroup,
  sortOrder: number,
  workspaceId?: string
): Promise<void> {
  const sb = createClient();
  const payload = {
    id:           group.id,
    name:         group.name,
    color:        group.color,
    sort_order:   sortOrder,
    workspace_id: workspaceId ?? null,
  };
  const { error } = await sb.from('timeline_groups').upsert(payload as never);
  if (error) throw error;
}

export async function deleteTimelineGroup(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from('timeline_groups').delete().eq('id', id);
  if (error) throw error;
}

// ── Workspace settings ──────────────────────────────────────────────────────

export async function fetchWorkspaceSettings(
  workspaceId: string
): Promise<Record<string, unknown> | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from('workspace_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export async function upsertWorkspaceSettings(
  workspaceId: string,
  settings: {
    vision?: string;
    defaultOKRPeriod?: string;
    defaultTimelineView?: string;
    defaultGanttScale?: string;
    okrPasswordProtection?: boolean;
  }
): Promise<void> {
  const sb = createClient();
  const payload: Record<string, unknown> = { workspace_id: workspaceId };
  if (settings.vision                !== undefined) payload.vision                   = settings.vision;
  if (settings.defaultOKRPeriod      !== undefined) payload.default_okr_period       = settings.defaultOKRPeriod;
  if (settings.defaultTimelineView   !== undefined) payload.default_timeline_view    = settings.defaultTimelineView;
  if (settings.defaultGanttScale     !== undefined) payload.default_gantt_scale      = settings.defaultGanttScale;
  if (settings.okrPasswordProtection !== undefined) payload.okr_password_protection  = settings.okrPasswordProtection;
  const { error } = await sb
    .from('workspace_settings')
    .upsert(payload as never, { onConflict: 'workspace_id' });
  if (error) throw error;
}

// ── Roadmap projects ────────────────────────────────────────────────────────

export async function fetchRoadmapProjects(workspaceId?: string): Promise<string[]> {
  const sb = createClient();
  let query = sb.from('roadmap_projects').select('name').order('name');
  if (workspaceId) query = query.eq('workspace_id', workspaceId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(row => row.name as string);
}

export async function upsertRoadmapProject(name: string, workspaceId?: string): Promise<void> {
  const sb = createClient();
  // Use name+workspace as a natural key (upsert by checking existence)
  const payload = {
    id: `rp-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    workspace_id: workspaceId ?? null,
  };
  const { error } = await sb.from('roadmap_projects').upsert(payload as never);
  if (error) throw error;
}
