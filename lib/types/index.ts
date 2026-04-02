export type TimelineItemStatus = 'not_started' | 'in_progress' | 'at_risk' | 'complete';
export type Priority = 'p0' | 'p1' | 'p2' | 'p3';
export type OKRStatus = 'on_track' | 'at_risk' | 'off_track';
export type MetricType = 'number' | 'percentage' | 'currency' | 'binary';
export type TimelineViewMode = 'gantt' | 'table' | 'board';
export type GanttScale = 'week' | 'month' | 'quarter';
export type Theme = 'light' | 'dark' | 'system';
export type PeriodType = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

export interface Department {
  id: string;
  name: string;
  color: string;
  password?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  workspaceRole?: WorkspaceRole;
}

export interface TimelineItem {
  id: string;
  title: string;
  description: string;
  type: 'project' | 'milestone' | 'task';
  parentId: string | null;
  status: TimelineItemStatus;
  priority: Priority;
  ownerId: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies: string[];
  tags: string[];
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  value: number;
  note: string;
  createdAt: string;
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  ownerId: string;
  metricType: MetricType;
  startValue: number;
  currentValue: number;
  targetValue: number;
  confidence: OKRStatus;
  weight: number; // 0-100, all KRs in an objective should sum to 100
  checkIns: CheckIn[];
  createdAt: string;
  updatedAt: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  period: string;
  periodType: PeriodType;
  department: string;
  isDraft: boolean;
  status: OKRStatus;
  password?: string; // optional password to restrict access to this objective
  useWeighting?: boolean; // whether KRs use weighted contribution
  keyResults: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineGroup {
  id: string;
  name: string;
  color: string;
}

export interface ActivityEvent {
  id: string;
  text: string;
  timestamp: string;
  type: 'status_change' | 'progress' | 'created' | 'checkin';
}

export interface RoadmapTask {
  id: string;
  title: string;
  type: 'ux' | 'dev';
  project: string;
  jiraUrl: string;
  assigneeId: string;
  startSprint: number;
  endSprint: number;
  priority: Priority;
  createdAt: string;
  /** Links back to a TimelineItem so changes stay in sync */
  timelineItemId?: string;
}

export interface Sprint {
  number: number;
  label: string;
  month: string;
  startDate: string;
  endDate: string;
}

// ── Roadmap Suggestions (AI-powered intake) ─────────────────────────────────

export type SuggestionSource = 'jira' | 'confluence' | 'slack' | 'document';
export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed' | 'deferred';

export interface SuggestionSourceContext {
  type: SuggestionSource;
  // JIRA
  jiraKey?: string;
  jiraUrl?: string;
  jiraStatus?: string;
  jiraAssignee?: string;
  jiraPriority?: string;
  // Confluence
  confluencePageId?: string;
  confluenceUrl?: string;
  confluenceSpaceKey?: string;
  confluenceAuthor?: string;
  // Slack
  slackChannelId?: string;
  slackChannelName?: string;
  slackThreadTs?: string;
  slackMessageUrl?: string;
  slackAuthor?: string;
  slackSnippet?: string;
  // Document upload
  documentFileName?: string;
  documentFileType?: string;
}

export interface RoadmapSuggestion {
  id: string;
  title: string;
  description: string;
  source: SuggestionSourceContext;
  suggestedPriority: Priority;
  suggestedType: 'project' | 'milestone' | 'task';
  suggestedGroupId: string;
  relevanceScore: number;
  duplicateOfId: string | null;
  duplicateConfidence: number;
  status: SuggestionStatus;
  deferredUntil: string | null;
  reviewedAt: string | null;
  scannedAt: string;
  createdAt: string;
  tags: string[];
}

// ── Workspace types ──────────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdBy: string | null;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  invitedBy: string | null;
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invitedBy: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface AppSettings {
  theme: Theme;
  accentColor: string;
  sidebarCompact: boolean;
  profile: {
    name: string;
    email: string;
    avatarUrl: string;
    role: string;
  };
  workspace: {
    name: string;
    vision: string;
    defaultOKRPeriod: string;
    defaultTimelineView: TimelineViewMode;
    defaultGanttScale: GanttScale;
    okrPasswordProtection: boolean;
  };
}
