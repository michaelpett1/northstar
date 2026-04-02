'use client';
import { useState, useRef, useCallback } from 'react';
import { Plus, User, ChevronDown, ChevronUp, Flame, Copy, ArrowDownToLine, Check, AlertTriangle, Undo2, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useRoadmapStore, generateSprints, getCurrentSprintNumber } from '@/lib/store/roadmapStore';
import { useProjectsStore } from '@/lib/store/projectsStore';
import type { SprintCapacity } from '@/lib/store/roadmapStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import type { RoadmapTask, TimelineItem, Priority } from '@/lib/types';
import ProductTour from '@/components/ui/ProductTour';
import { ROADMAP_TOUR } from '@/lib/data/tourSteps';

const UX_COLOR = '#2563EB';
const DEV_COLOR = '#C084AC';

function typeColor(type: 'ux' | 'dev') {
  return type === 'ux' ? UX_COLOR : DEV_COLOR;
}

const PRIORITY_RANK: Record<Priority, number> = { p0: 0, p1: 1, p2: 2, p3: 3 };
const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  p0: { bg: '#FEE2E2', text: '#DC2626' },
  p1: { bg: '#FEF3C7', text: '#D97706' },
  p2: { bg: '#DBEAFE', text: '#2563EB' },
  p3: { bg: '#F3F4F6', text: '#6B7280' },
};

const SPRINTS = generateSprints(26);

// Group sprints by month
function groupByMonth(sprints: typeof SPRINTS) {
  const groups: { month: string; sprints: typeof SPRINTS }[] = [];
  for (const sprint of sprints) {
    const last = groups[groups.length - 1];
    if (last && last.month === sprint.month) {
      last.sprints.push(sprint);
    } else {
      groups.push({ month: sprint.month, sprints: [sprint] });
    }
  }
  return groups;
}

const MONTH_GROUPS = groupByMonth(SPRINTS);

interface AddTaskForm {
  title: string;
  team: 'ux' | 'dev';
  startSprint: number;
  endSprint: number;
  project: string;
  jiraUrl: string;
  assigneeId: string;
  priority: Priority;
}

function defaultForm(overrides?: Partial<AddTaskForm>): AddTaskForm {
  const current = getCurrentSprintNumber();
  return {
    title: '',
    team: 'ux',
    startSprint: current,
    endSprint: current,
    project: '',
    jiraUrl: '',
    assigneeId: '',
    priority: 'p2',
    ...overrides,
  };
}

function TaskCard({
  task,
  onDragStart,
  onEdit,
  onDelete,
  onClone,
}: {
  task: RoadmapTask;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onEdit: (task: RoadmapTask) => void;
  onDelete: (id: string) => void;
  onClone: (task: RoadmapTask, type: 'ux' | 'dev') => void;
}) {
  const teamMembers = useSettingsStore(s => s.teamMembers);
  const color = typeColor(task.type);
  const member = teamMembers.find(m => m.id === task.assigneeId);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onDoubleClick={e => { e.stopPropagation(); onEdit(task); }}
      className="group"
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 7,
        padding: '10px 12px',
        minWidth: 200,
        maxWidth: 240,
        cursor: 'grab',
        userSelect: 'none',
        position: 'relative',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      {/* Actions — floating toolbar on hover */}
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{
          position: 'absolute',
          top: -10,
          right: 6,
          display: 'flex',
          gap: 1,
          background: 'var(--bg-primary)',
          borderRadius: 8,
          padding: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px var(--border)',
          zIndex: 5,
        }}
      >
        <button
          onClick={e => { e.stopPropagation(); onEdit(task); }}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 150ms, background 150ms' }}
          title="Edit task"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onClone(task, 'ux'); }}
          className="hover:bg-blue-50 dark:hover:bg-blue-900/30"
          style={{ height: 26, display: 'flex', alignItems: 'center', gap: 3, borderRadius: 6, border: 'none', background: 'transparent', color: UX_COLOR, cursor: 'pointer', padding: '0 6px', fontSize: 10, fontWeight: 600, transition: 'background 150ms' }}
          title="Clone as UX task"
        >
          <Copy size={10} />
          UX
        </button>
        <button
          onClick={e => { e.stopPropagation(); onClone(task, 'dev'); }}
          className="hover:bg-purple-50 dark:hover:bg-purple-900/30"
          style={{ height: 26, display: 'flex', alignItems: 'center', gap: 3, borderRadius: 6, border: 'none', background: 'transparent', color: DEV_COLOR, cursor: 'pointer', padding: '0 6px', fontSize: 10, fontWeight: 600, transition: 'background 150ms' }}
          title="Clone as Dev task"
        >
          <Copy size={10} />
          DEV
        </button>
        <div style={{ width: 1, background: 'var(--border)', margin: '4px 1px' }} />
        <button
          onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          className="hover:bg-red-50 dark:hover:bg-red-900/30"
          style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-disabled)', cursor: 'pointer', transition: 'color 150ms, background 150ms' }}
          title="Delete task"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Type badge + priority */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--bg-primary)',
            backgroundColor: color,
            borderRadius: 3,
            padding: '1px 5px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {task.type === 'ux' ? 'UX' : 'DEV'}
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: PRIORITY_COLORS[task.priority].text,
            background: PRIORITY_COLORS[task.priority].bg,
            borderRadius: 3,
            padding: '1px 5px',
            letterSpacing: '0.04em',
          }}
        >
          {task.priority.toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 4 }}>
        {task.title}
      </p>

      {/* Project */}
      {task.project && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
          {task.project}
        </p>
      )}

      {/* Assignee */}
      {member && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <User size={10} color="var(--text-muted)" />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{member.name}</span>
        </div>
      )}
    </div>
  );
}

/* ── Capacity Buttons ──────────────────────────────────── */
function CapacityButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 10,
        fontWeight: 500,
        color: disabled ? 'var(--text-disabled)' : 'var(--text-tertiary)',
        background: disabled ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
        border: '1px solid',
        borderColor: disabled ? 'var(--bg-subtle)' : 'var(--border-medium)',
        borderRadius: 4,
        padding: '3px 8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.16)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = disabled ? 'var(--bg-tertiary)' : 'var(--bg-primary)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = disabled ? 'var(--bg-subtle)' : 'var(--border-medium)';
      }}
    >
      {children}
    </button>
  );
}

function SprintDropZone({
  sprint,
  tasks,
  capacity,
  isCurrentSprint,
  collapsed,
  onToggleCollapse,
  onDragStart,
  onDropTask,
  onDropNewType,
  onOpenAddModal,
  onEditTask,
  onDeleteTask,
  onCloneTask,
  onCapacityChange,
}: {
  sprint: (typeof SPRINTS)[number];
  tasks: RoadmapTask[];
  capacity: SprintCapacity;
  isCurrentSprint: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDropTask: (sprintNumber: number, taskId: string) => void;
  onDropNewType: (sprintNumber: number, type: 'ux' | 'dev') => void;
  onOpenAddModal: (sprintNumber: number, type?: 'ux' | 'dev') => void;
  onEditTask: (task: RoadmapTask) => void;
  onDeleteTask: (id: string) => void;
  onCloneTask: (task: RoadmapTask, type: 'ux' | 'dev') => void;
  onCapacityChange: (sprintNumber: number, type: 'dev' | 'ux', value: number) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData('task-id');
    const newType = e.dataTransfer.getData('new-type') as 'ux' | 'dev' | '';
    if (taskId) {
      onDropTask(sprint.number, taskId);
    } else if (newType === 'ux' || newType === 'dev') {
      onDropNewType(sprint.number, newType);
    }
  }

  const devCount = tasks.filter(t => t.type === 'dev').length;
  const uxCount = tasks.filter(t => t.type === 'ux').length;

  return (
    <div>
      {/* Sprint row header */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--text-muted)',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              transition: 'transform 150ms ease',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
            title={collapsed ? 'Expand sprint' : 'Collapse sprint'}
          >
            <ChevronDown size={14} />
          </button>
          <span>{sprint.label}</span>
          {isCurrentSprint && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--bg-primary)',
                background: '#16A34A',
                borderRadius: 3,
                padding: '1px 5px',
                letterSpacing: '0.06em',
              }}
            >
              CURRENT
            </span>
          )}
          {collapsed && (
            <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-disabled)' }}>
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-disabled)', letterSpacing: 0 }}>
            {new Date(sprint.startDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(sprint.endDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: DEV_COLOR, background: 'rgba(159,90,168,0.08)', borderRadius: 3, padding: '1px 5px' }}>
              DEV {devCount}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: UX_COLOR, background: 'rgba(37,99,235,0.08)', borderRadius: 3, padding: '1px 5px' }}>
              UX {uxCount}
            </span>
          </div>
        </div>
      </div>

      {/* Cards area + Capacity — hidden when collapsed */}
      {!collapsed && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              padding: '8px 16px 12px',
              minHeight: 80,
              borderRadius: 6,
              transition: 'background 0.15s',
              background: dragOver ? 'rgba(37,99,235,0.04)' : 'transparent',
              border: dragOver ? '1.5px dashed rgba(37,99,235,0.25)' : '1.5px dashed transparent',
            }}
          >
            {tasks.length === 0 ? (
              <div
                style={{
                  color: 'var(--text-disabled)',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 0',
                  cursor: 'pointer',
                }}
                onClick={() => onOpenAddModal(sprint.number)}
              >
                Drop tasks here or{' '}
                <span style={{ color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}>
                  add one
                </span>
              </div>
            ) : (
              [...tasks].sort((a, b) => {
                // Dev first, then UX
                if (a.type === 'dev' && b.type !== 'dev') return -1;
                if (a.type !== 'dev' && b.type === 'dev') return 1;
                // Within same type, sort by priority rank (p0 first)
                return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
              }).map(task => (
                <TaskCard key={task.id} task={task} onDragStart={onDragStart} onEdit={onEditTask} onDelete={onDeleteTask} onClone={onCloneTask} />
              ))
            )}
          </div>

          {/* Capacity buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              padding: '6px 16px 10px',
              borderTop: '1px solid var(--bg-subtle)',
            }}
          >
            <CapacityButton
              onClick={() => onCapacityChange(sprint.number, 'dev', capacity.dev + 1)}
              disabled={capacity.dev >= 15}
            >
              + Dev Capacity
            </CapacityButton>
            <CapacityButton
              onClick={() => onCapacityChange(sprint.number, 'dev', capacity.dev - 1)}
              disabled={capacity.dev <= 0}
            >
              − Dev Capacity
            </CapacityButton>
            <CapacityButton
              onClick={() => onCapacityChange(sprint.number, 'ux', capacity.ux + 1)}
              disabled={capacity.ux >= 15}
            >
              + UX Capacity
            </CapacityButton>
            <CapacityButton
              onClick={() => onCapacityChange(sprint.number, 'ux', capacity.ux - 1)}
              disabled={capacity.ux <= 0}
            >
              − UX Capacity
            </CapacityButton>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Add Task Modal ─────────────────────────────────────── */
function AddTaskModal({
  open,
  onClose,
  defaultValues,
  editingTask,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues: Partial<AddTaskForm>;
  editingTask: RoadmapTask | null;
}) {
  const { addTask, updateTask, deleteTask, projects, addProject, teams, addTeam } = useRoadmapStore();
  const teamMembers = useSettingsStore(s => s.teamMembers);
  const [form, setForm] = useState<AddTaskForm>(() => defaultForm(defaultValues));
  const [newProjectInput, setNewProjectInput] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTeamInput, setNewTeamInput] = useState('');
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddTaskForm, string>>>({});

  // Reset form when modal opens with new defaults
  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    prevOpen.current = true;
    setForm(defaultForm(defaultValues));
    setErrors({});
  }
  if (!open && prevOpen.current) {
    prevOpen.current = false;
  }

  function set<K extends keyof AddTaskForm>(key: K, val: AddTaskForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof AddTaskForm, string>> = {};
    if (!form.title.trim()) errs.title = 'Required';
    if (!form.team) errs.team = 'Required';
    if (!form.startSprint) errs.startSprint = 'Required';
    if (!form.endSprint) errs.endSprint = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (editingTask) {
      // Update existing task — preserve ID, createdAt, and timelineItemId
      updateTask(editingTask.id, {
        title: form.title.trim(),
        type: form.team,
        project: form.project,
        jiraUrl: form.jiraUrl,
        assigneeId: form.assigneeId,
        startSprint: form.startSprint,
        endSprint: form.endSprint,
        priority: form.priority,
      });
    } else {
      // Create new task
      const task: RoadmapTask = {
        id: Math.random().toString(36).slice(2, 9),
        title: form.title.trim(),
        type: form.team,
        project: form.project,
        jiraUrl: form.jiraUrl,
        assigneeId: form.assigneeId,
        startSprint: form.startSprint,
        endSprint: form.endSprint,
        priority: form.priority,
        createdAt: new Date().toISOString(),
      };
      addTask(task);
    }
    setForm(defaultForm(defaultValues));
    onClose();
  }

  function handleAddProject() {
    const name = newProjectInput.trim();
    if (name && !projects.includes(name)) {
      addProject(name);
    }
    if (name) set('project', name);
    setNewProjectInput('');
    setShowNewProject(false);
  }

  function handleAddTeam() {
    const name = newTeamInput.trim().toUpperCase();
    if (name && !teams.includes(name)) {
      addTeam(name);
    }
    setNewTeamInput('');
    setShowNewTeam(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    fontSize: 13,
    border: '1px solid var(--input-border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    background: 'var(--input-bg)',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: 5,
  };

  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  const errStyle: React.CSSProperties = { fontSize: 11, color: '#EF4444', marginTop: 3 };

  return (
    <Modal open={open} onClose={onClose} title={editingTask ? 'Edit Task' : 'Add Task'}>
      <form onSubmit={handleSubmit} style={{ minWidth: 380 }}>
        {/* Task Name */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Task Name *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.title ? '#EF4444' : 'var(--input-border)' }}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Enter task name"
            autoFocus
          />
          {errors.title && <p style={errStyle}>{errors.title}</p>}
        </div>

        {/* Team */}
        <div style={fieldStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Team *</label>
            {!showNewTeam && (
              <button
                type="button"
                onClick={() => setShowNewTeam(true)}
                style={{ fontSize: 11, color: UX_COLOR, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                + Create Team
              </button>
            )}
          </div>
          {showNewTeam ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={newTeamInput}
                onChange={e => setNewTeamInput(e.target.value)}
                placeholder="Team name"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTeam(); } }}
              />
              <button type="button" onClick={handleAddTeam} style={{ fontSize: 12, color: UX_COLOR, background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px' }}>Add</button>
              <button type="button" onClick={() => setShowNewTeam(false)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
            </div>
          ) : (
            <select
              style={inputStyle}
              value={form.team}
              onChange={e => set('team', e.target.value as 'ux' | 'dev')}
            >
              <option value="ux">UX</option>
              <option value="dev">DEV</option>
              {teams.filter(t => t !== 'UX' && t !== 'DEV').map(t => (
                <option key={t} value={t.toLowerCase()}>{t}</option>
              ))}
            </select>
          )}
          {errors.team && <p style={errStyle}>{errors.team}</p>}
        </div>

        {/* Start Sprint & End Sprint */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Start Sprint *</label>
            <select
              style={inputStyle}
              value={form.startSprint}
              onChange={e => set('startSprint', Number(e.target.value))}
            >
              {SPRINTS.map(s => (
                <option key={s.number} value={s.number}>{s.label}</option>
              ))}
            </select>
            {errors.startSprint && <p style={errStyle}>{errors.startSprint}</p>}
          </div>
          <div>
            <label style={labelStyle}>End Sprint *</label>
            <select
              style={inputStyle}
              value={form.endSprint}
              onChange={e => set('endSprint', Number(e.target.value))}
            >
              {SPRINTS.map(s => (
                <option key={s.number} value={s.number}>{s.label}</option>
              ))}
            </select>
            {errors.endSprint && <p style={errStyle}>{errors.endSprint}</p>}
          </div>
        </div>

        {/* Project */}
        <div style={fieldStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Project (optional)</label>
            {!showNewProject && (
              <button
                type="button"
                onClick={() => setShowNewProject(true)}
                style={{ fontSize: 11, color: UX_COLOR, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                + Create Project
              </button>
            )}
          </div>
          {showNewProject ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={newProjectInput}
                onChange={e => setNewProjectInput(e.target.value)}
                placeholder="Project name"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddProject(); } }}
              />
              <button type="button" onClick={handleAddProject} style={{ fontSize: 12, color: UX_COLOR, background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px' }}>Add</button>
              <button type="button" onClick={() => setShowNewProject(false)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
            </div>
          ) : (
            <select
              style={inputStyle}
              value={form.project}
              onChange={e => set('project', e.target.value)}
            >
              <option value="">— None —</option>
              {projects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>

        {/* Jira Ticket URL */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Jira Ticket URL (optional)</label>
          <input
            style={inputStyle}
            value={form.jiraUrl}
            onChange={e => set('jiraUrl', e.target.value)}
            placeholder="e.g., https://yourcompany.atlassian.net/browse/DEV-123"
            type="url"
          />
        </div>

        {/* Assigned To */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Assigned To (optional)</label>
          <select
            style={inputStyle}
            value={form.assigneeId}
            onChange={e => set('assigneeId', e.target.value)}
          >
            <option value="">Unassigned</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Priority</label>
          <select
            style={inputStyle}
            value={form.priority}
            onChange={e => set('priority', e.target.value as Priority)}
          >
            <option value="p0">🔥 P0 — Critical</option>
            <option value="p1">P1 — High</option>
            <option value="p2">P2 — Medium</option>
            <option value="p3">P3 — Low</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: 6,
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: '7px 16px',
              borderRadius: 6,
              border: 'none',
              color: 'var(--bg-primary)',
              background: UX_COLOR,
              cursor: 'pointer',
            }}
          >
            {editingTask ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Generate from Timeline Modal ──────────────────────── */
function GenerateFromTimelineModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const timelineItems = useProjectsStore(s => s.items);
  const timelineGroups = useProjectsStore(s => s.groups);
  const { tasks, addTask } = useRoadmapStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState(false);
  const [importCount, setImportCount] = useState(0);

  // Analyze which timeline items already exist in the roadmap
  const analysis = (() => {
    const results: {
      item: TimelineItem;
      groupName: string;
      isDuplicate: boolean;
      matchReason?: string;
    }[] = [];

    for (const item of timelineItems) {
      const group = timelineGroups.find(g => g.id === item.groupId);
      const groupName = group?.name ?? 'Ungrouped';

      // Check for duplicates:
      // 1. Exact timelineItemId link
      const linkedMatch = tasks.find(t => t.timelineItemId === item.id);
      if (linkedMatch) {
        results.push({ item, groupName, isDuplicate: true, matchReason: 'Already linked' });
        continue;
      }

      // 2. Title match (case-insensitive, trimmed)
      const titleMatch = tasks.find(
        t => t.title.trim().toLowerCase() === item.title.trim().toLowerCase()
      );
      if (titleMatch) {
        results.push({ item, groupName, isDuplicate: true, matchReason: 'Title match' });
        continue;
      }

      results.push({ item, groupName, isDuplicate: false });
    }

    return results;
  })();

  const newItems = analysis.filter(a => !a.isDuplicate);
  const duplicates = analysis.filter(a => a.isDuplicate);

  // Auto-select all new items on open
  const prevOpen = useRef(false);
  if (open && !prevOpen.current) {
    prevOpen.current = true;
    setSelected(new Set(newItems.map(a => a.item.id)));
    setImported(false);
    setImportCount(0);
  }
  if (!open && prevOpen.current) {
    prevOpen.current = false;
  }

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === newItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(newItems.map(a => a.item.id)));
    }
  }

  function handleImport() {
    let count = 0;
    for (const a of newItems) {
      if (!selected.has(a.item.id)) continue;

      const task: RoadmapTask = {
        id: Math.random().toString(36).slice(2, 9),
        title: a.item.title,
        type: 'dev',
        project: a.groupName,
        jiraUrl: '',
        assigneeId: a.item.ownerId,
        startSprint: 0, // Goes to planning
        endSprint: 0,
        priority: a.item.priority,
        createdAt: new Date().toISOString(),
        timelineItemId: a.item.id,
      };
      addTask(task);
      count++;
    }
    setImportCount(count);
    setImported(true);
  }

  // Group new items by their timeline group for display
  const groupedNew = newItems.reduce<Record<string, typeof newItems>>((acc, a) => {
    if (!acc[a.groupName]) acc[a.groupName] = [];
    acc[a.groupName].push(a);
    return acc;
  }, {});

  return (
    <Modal open={open} onClose={onClose} title="Generate Tickets from Timeline">
      <div style={{ minWidth: 460, maxWidth: 540 }}>
        {imported ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Check size={24} color="#16A34A" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {importCount} {importCount === 1 ? 'ticket' : 'tickets'} created
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Added as DEV tasks in the Planning section. Drag them into sprints to schedule.
            </p>
            <button
              onClick={onClose}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 20px',
                borderRadius: 6,
                border: 'none',
                color: 'var(--bg-primary)',
                background: UX_COLOR,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Explanation */}
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14, lineHeight: 1.5 }}>
              Import timeline items as DEV tickets in the Planning section. Duplicates are
              automatically detected and skipped.
            </p>

            {/* Duplicates warning */}
            {duplicates.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'var(--warning-bg)',
                  borderRadius: 6,
                  marginBottom: 14,
                  border: '1px solid rgba(245,158,11,0.2)',
                }}
              >
                <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 2 }}>
                    {duplicates.length} {duplicates.length === 1 ? 'item' : 'items'} already exist
                  </p>
                  <div style={{ fontSize: 11, color: '#B45309', lineHeight: 1.5 }}>
                    {duplicates.slice(0, 5).map(d => (
                      <div key={d.item.id}>• {d.item.title} <span style={{ opacity: 0.7 }}>({d.matchReason})</span></div>
                    ))}
                    {duplicates.length > 5 && (
                      <div style={{ opacity: 0.7 }}>…and {duplicates.length - 5} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* New items to import */}
            {newItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>All timeline items already exist in the roadmap.</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No new tickets to generate.</p>
              </div>
            ) : (
              <>
                {/* Select all toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.size === newItems.length}
                      onChange={toggleAll}
                      style={{ width: 14, height: 14 }}
                    />
                    Select all ({newItems.length})
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {selected.size} selected
                  </span>
                </div>

                {/* Scrollable list grouped by section */}
                <div
                  style={{
                    maxHeight: 320,
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    marginBottom: 14,
                  }}
                >
                  {Object.entries(groupedNew).map(([groupName, items]) => (
                    <div key={groupName}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-tertiary)',
                          background: 'var(--bg-tertiary)',
                          padding: '6px 10px',
                          borderBottom: '1px solid var(--border-row)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          position: 'sticky',
                          top: 0,
                        }}
                      >
                        {groupName}
                      </div>
                      {items.map(a => (
                        <label
                          key={a.item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '7px 10px',
                            borderBottom: '1px solid var(--bg-subtle)',
                            cursor: 'pointer',
                            background: selected.has(a.item.id) ? 'rgba(37,99,235,0.03)' : 'transparent',
                            transition: 'background 0.1s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(a.item.id)}
                            onChange={() => toggleItem(a.item.id)}
                            style={{ width: 14, height: 14, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {a.item.title}
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {a.item.type}
                              </span>
                              {(a.item.priority === 'p0' || a.item.priority === 'p1') && (
                                <span style={{ fontSize: 10, color: '#DC2626' }}>
                                  🔥 {a.item.priority.toUpperCase()}
                                </span>
                              )}
                              <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
                                {a.item.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: 'var(--bg-primary)',
                              background: DEV_COLOR,
                              borderRadius: 3,
                              padding: '1px 5px',
                              flexShrink: 0,
                            }}
                          >
                            DEV
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-primary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              {newItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={selected.size === 0}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '7px 16px',
                    borderRadius: 6,
                    border: 'none',
                    color: 'var(--bg-primary)',
                    background: selected.size === 0 ? 'var(--text-disabled)' : DEV_COLOR,
                    cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <ArrowDownToLine size={13} />
                  Generate {selected.size} {selected.size === 1 ? 'Ticket' : 'Tickets'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
const SPRINTS_PER_PAGE = 3;

export default function RoadmapPage() {
  const { tasks, moveTask, deleteTask, updateTask, getCapacity, setCapacity, undo, canUndo, getUndoLabel } = useRoadmapStore();
  const currentSprintNumber = getCurrentSprintNumber();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<Partial<AddTaskForm>>({});
  const dragTaskId = useRef<string | null>(null);
  const [editingTask, setEditingTask] = useState<RoadmapTask | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [collapsedSprints, setCollapsedSprints] = useState<Set<number>>(new Set());
  const [undoToast, setUndoToast] = useState<string | null>(null);
  const undoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUndo = canUndo();
  const undoLabel = getUndoLabel();

  function handleUndo() {
    const label = undo();
    if (label) {
      setUndoToast(`Undid: ${label}`);
      if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
      undoToastTimer.current = setTimeout(() => setUndoToast(null), 2500);
    }
  }

  // Progressive sprint loading: current + next 3, then +3 each click
  const [visibleCount, setVisibleCount] = useState(1 + SPRINTS_PER_PAGE); // current + 3 more

  // Build the sprint list starting from current sprint
  const currentSprintIndex = SPRINTS.findIndex(s => s.number === currentSprintNumber);
  const startIndex = Math.max(0, currentSprintIndex);
  const remainingSprints = SPRINTS.slice(startIndex);
  const displaySprints = remainingSprints.slice(0, visibleCount);
  const hasMore = visibleCount < remainingSprints.length;
  const remainingCount = remainingSprints.length - visibleCount;
  const displayGroups = groupByMonth(displaySprints);

  function loadMore() {
    setVisibleCount(prev => prev + SPRINTS_PER_PAGE);
  }

  function openAddModal(sprintNumber?: number, type?: 'ux' | 'dev') {
    setEditingTask(null); // Clear any stale editing state
    setModalDefaults({
      ...(sprintNumber ? { startSprint: sprintNumber, endSprint: sprintNumber } : {}),
      ...(type ? { team: type } : {}),
    });
    setModalOpen(true);
  }

  function handleTaskDragStart(e: React.DragEvent, id: string) {
    dragTaskId.current = id;
    e.dataTransfer.setData('task-id', id);
  }

  function handleNewTypeDragStart(e: React.DragEvent, type: 'ux' | 'dev') {
    dragTaskId.current = null;
    e.dataTransfer.setData('new-type', type);
  }

  function handleDropTask(sprintNumber: number, taskId: string) {
    moveTask(taskId, sprintNumber);
  }

  function handleDropNewType(sprintNumber: number, type: 'ux' | 'dev') {
    openAddModal(sprintNumber, type);
  }

  function handleEditTask(task: RoadmapTask) {
    setEditingTask(task);
    setModalDefaults({
      team: task.type,
      startSprint: task.startSprint || 1,
      endSprint: task.endSprint || 1,
      title: task.title,
      project: task.project,
      jiraUrl: task.jiraUrl,
      assigneeId: task.assigneeId,
      priority: task.priority,
    });
    setModalOpen(true);
  }

  function handleCloneTask(task: RoadmapTask, type: 'ux' | 'dev') {
    const { addTask } = useRoadmapStore.getState();
    const cloned: RoadmapTask = {
      ...task,
      id: Math.random().toString(36).slice(2, 9),
      type,
      title: task.title,
      createdAt: new Date().toISOString(),
      timelineItemId: undefined,
    };
    addTask(cloned);
  }

  function toggleCollapseSprint(sprintNumber: number) {
    setCollapsedSprints(prev => {
      const next = new Set(prev);
      if (next.has(sprintNumber)) {
        next.delete(sprintNumber);
      } else {
        next.add(sprintNumber);
      }
      return next;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          minHeight: 52,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        {/* Left: Title area */}
        <div>
          <h1 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Visual Roadmap</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Sprint planning and task management</p>
        </div>

        <div style={{ width: 1, height: 28, background: 'var(--border)', marginLeft: 4, marginRight: 4 }} />

        {/* Drag instruction */}
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Drag to create new task</span>

        {/* Draggable chips */}
        <div
          draggable
          onDragStart={e => handleNewTypeDragStart(e, 'ux')}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--bg-primary)',
            background: UX_COLOR,
            borderRadius: 5,
            padding: '4px 10px',
            cursor: 'grab',
            userSelect: 'none',
            letterSpacing: '0.02em',
          }}
        >
          UX Task
        </div>
        <div
          draggable
          onDragStart={e => handleNewTypeDragStart(e, 'dev')}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--bg-primary)',
            background: DEV_COLOR,
            borderRadius: 5,
            padding: '4px 10px',
            cursor: 'grab',
            userSelect: 'none',
            letterSpacing: '0.02em',
          }}
        >
          Dev Task
        </div>

        <div style={{ flex: 1 }} />

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={!hasUndo}
          title={undoLabel ? `Undo: ${undoLabel}` : 'Nothing to undo'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 500,
            color: hasUndo ? 'var(--text-secondary)' : 'var(--text-disabled)',
            background: 'var(--bg-primary)',
            border: '1px solid',
            borderColor: hasUndo ? 'var(--border-strong)' : 'var(--border-row)',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: hasUndo ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            if (hasUndo) {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.18)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-primary)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = hasUndo ? 'var(--border-strong)' : 'var(--border-row)';
          }}
        >
          <Undo2 size={13} />
          Undo
        </button>

        {/* Generate from Timeline */}
        <button
          onClick={() => setGenerateModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 500,
            color: DEV_COLOR,
            background: 'var(--bg-primary)',
            border: `1px solid ${DEV_COLOR}`,
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(159,90,168,0.06)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-primary)';
          }}
        >
          <ArrowDownToLine size={13} />
          Generate from Timeline
        </button>

        {/* Add Task button */}
        <button
          onClick={() => openAddModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--bg-primary)',
            background: UX_COLOR,
            border: 'none',
            borderRadius: 6,
            padding: '7px 13px',
            cursor: 'pointer',
          }}
        >
          <Plus size={13} />
          Add Task
        </button>
      </div>

      {/* Sprint Board */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 32px' }}>
        {/* Planning section — unscheduled tasks (sprint 0) */}
        {(() => {
          const planningTasks = tasks.filter(t => t.startSprint === 0);
          if (planningTasks.length === 0) return null;
          return (
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '12px 16px 10px',
                  borderBottom: '1px solid var(--border)',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--warning-bg)',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14 }}>📋</span>
                Planning
                <span style={{ fontSize: 11, fontWeight: 400, color: '#92400E', marginLeft: 4 }}>
                  {planningTasks.length} {planningTasks.length === 1 ? 'task' : 'tasks'} — drag into a sprint to schedule
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  padding: '12px 16px 16px',
                  background: 'var(--warning-bg)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {[...planningTasks].sort((a, b) => {
                  if (a.type === 'dev' && b.type !== 'dev') return -1;
                  if (a.type !== 'dev' && b.type === 'dev') return 1;
                  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
                }).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={handleTaskDragStart}
                    onEdit={handleEditTask}
                    onDelete={(id) => deleteTask(id)}
                    onClone={handleCloneTask}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        {displayGroups.map(group => (
          <div key={group.month}>
            {/* Month header */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                padding: '12px 16px 10px',
                borderBottom: '1px solid var(--border)',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-secondary)',
                zIndex: 10,
              }}
            >
              {group.month}
            </div>

            {/* Sprints in this month */}
            {group.sprints.map(sprint => {
              const sprintTasks = tasks.filter(
                t => t.startSprint <= sprint.number && t.endSprint >= sprint.number
              );
              return (
                <SprintDropZone
                  key={sprint.number}
                  sprint={sprint}
                  tasks={sprintTasks}
                  capacity={getCapacity(sprint.number)}
                  isCurrentSprint={sprint.number === currentSprintNumber}
                  collapsed={collapsedSprints.has(sprint.number)}
                  onToggleCollapse={() => toggleCollapseSprint(sprint.number)}
                  onDragStart={handleTaskDragStart}
                  onDropTask={handleDropTask}
                  onDropNewType={handleDropNewType}
                  onOpenAddModal={openAddModal}
                  onEditTask={handleEditTask}
                  onDeleteTask={(id) => deleteTask(id)}
                  onCloneTask={handleCloneTask}
                  onCapacityChange={setCapacity}
                />
              );
            })}
          </div>
        ))}

        {/* Load More button */}
        {hasMore && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '20px 16px 8px',
            }}
          >
            <button
              onClick={loadMore}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 8,
                padding: '10px 24px',
                cursor: 'pointer',
                boxShadow: 'var(--card-shadow)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.18)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-primary)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--card-shadow)';
              }}
            >
              <ChevronDown size={14} />
              Load {Math.min(SPRINTS_PER_PAGE, remainingCount)} more {Math.min(SPRINTS_PER_PAGE, remainingCount) === 1 ? 'sprint' : 'sprints'}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                ({remainingCount} remaining)
              </span>
            </button>
          </div>
        )}

        {/* All loaded indicator */}
        {!hasMore && displaySprints.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '16px',
              fontSize: 11,
              color: 'var(--text-disabled)',
            }}
          >
            All sprints loaded
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        defaultValues={modalDefaults}
        editingTask={editingTask}
      />

      {/* Generate from Timeline Modal */}
      <GenerateFromTimelineModal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
      />

      {/* Undo toast */}
      {undoToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#1F2937',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            padding: '10px 18px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            zIndex: 100,
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          <Undo2 size={14} />
          {undoToast}
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <ProductTour tourKey="roadmap" steps={ROADMAP_TOUR} />
    </div>
  );
}
