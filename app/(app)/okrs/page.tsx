'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, TrendingUp, TrendingDown, Minus, Trash2, AlertCircle, Lock, Unlock, Pencil, X, Target, BarChart3, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';
import { useOKRsStore } from '@/lib/store/okrsStore';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useToastStore } from '@/lib/store/toastStore';
import { CheckInModal } from '@/components/okrs/CheckInModal';
import { Modal } from '@/components/ui/Modal';
import { OKRStatusBadge } from '@/components/ui/Badge';
import { ProgressBar, DonutProgress } from '@/components/ui/ProgressBar';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { KeyResult, Objective, OKRStatus, MetricType, PeriodType } from '@/lib/types';
import { calcKRProgress, calcObjectiveProgress, OKR_STATUS_LABELS } from '@/lib/utils/colorUtils';
import { clsx } from '@/lib/utils/clsx';
import { formatRelative } from '@/lib/utils/dateUtils';
import ProductTour from '@/components/ui/ProductTour';
import { OKRS_TOUR } from '@/lib/data/tourSteps';
import { useIsAdmin } from '@/lib/hooks/useIsAdmin';

function formatKRValue(kr: KeyResult, value: number): string {
  if (kr.metricType === 'currency')   return `$${value.toLocaleString()}`;
  if (kr.metricType === 'percentage') return `${value}%`;
  if (kr.metricType === 'binary')     return value ? 'Done' : 'Not done';
  return String(value);
}

/* ── Confidence pill ─────────────────────────────────────────────── */
const CONF_COLORS: Record<OKRStatus, { bg: string; text: string; icon: React.ElementType }> = {
  on_track:  { bg: 'var(--success-bg)', text: 'var(--success-text)', icon: TrendingUp },
  at_risk:   { bg: 'var(--warning-bg)', text: 'var(--warning-text)', icon: Minus },
  off_track: { bg: 'var(--danger-bg)', text: 'var(--danger-text)', icon: TrendingDown },
};

function ConfPill({ confidence, onToggle }: { confidence: OKRStatus; onToggle: () => void }) {
  const c = CONF_COLORS[confidence];
  const Icon = c.icon;
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle(); }}
      title="Click to cycle confidence"
      className="inline-flex items-center gap-1 rounded-[3px] font-semibold transition-opacity duration-150 hover:opacity-75 whitespace-nowrap"
      style={{ padding: '2px 7px', fontSize: '11px', background: c.bg, color: c.text }}
    >
      <Icon size={10} />
      {OKR_STATUS_LABELS[confidence]}
    </button>
  );
}

/* ── Delete Confirmation Modal ──────────────────────────────────── */
function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
        <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-primary)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 6, border: 'none', color: 'var(--bg-primary)', background: '#DC2626', cursor: 'pointer' }}
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Edit Objective Modal ───────────────────────────────────────── */
function EditObjectiveModal({ open, onClose, obj }: { open: boolean; onClose: () => void; obj: Objective }) {
  const { updateObjective } = useOKRsStore();
  const departments = useSettingsStore(s => s.departments);
  const teamMembers = useSettingsStore(s => s.teamMembers);
  const addToast = useToastStore(s => s.addToast);
  const [form, setForm] = useState({
    title: obj.title,
    description: obj.description,
    period: obj.period,
    periodType: obj.periodType,
    department: obj.department,
    ownerId: obj.ownerId,
    status: obj.status,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    updateObjective(obj.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      period: form.period,
      periodType: form.periodType,
      department: form.department,
      ownerId: form.ownerId,
      status: form.status,
    });
    addToast(`Updated objective: "${form.title.trim()}"`, 'success');
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--border-strong)', borderRadius: 6,
    color: 'var(--text-primary)', background: 'var(--bg-primary)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 };
  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <Modal open={open} onClose={onClose} title="Edit Objective">
      <form onSubmit={handleSubmit} style={{ minWidth: 400 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Department</label>
          <select style={inputStyle} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
            <option value="">— None —</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Period</label>
            <select style={inputStyle} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
              <option value="2026-Q1">2026-Q1</option>
              <option value="2026-Q2">2026-Q2</option>
              <option value="2026-Q3">2026-Q3</option>
              <option value="2026-Q4">2026-Q4</option>
              <option value="2026-H1">2026-H1</option>
              <option value="2026-H2">2026-H2</option>
              <option value="2026">2026 (Annual)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Period Type</label>
            <select style={inputStyle} value={form.periodType} onChange={e => setForm(f => ({ ...f, periodType: e.target.value as PeriodType }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as OKRStatus }))}>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Owner</label>
            <select style={inputStyle} value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}>
              <option value="">Unassigned</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 6 }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-primary)', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 6, border: 'none', color: 'var(--bg-primary)', background: 'var(--app-accent, #2563EB)', cursor: 'pointer' }}>Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Edit Key Result Modal ──────────────────────────────────────── */
function EditKeyResultModal({
  open,
  onClose,
  kr,
  objectiveId,
}: {
  open: boolean;
  onClose: () => void;
  kr: KeyResult;
  objectiveId: string;
}) {
  const { updateKeyResult } = useOKRsStore();
  const teamMembers = useSettingsStore(s => s.teamMembers);
  const addToast = useToastStore(s => s.addToast);
  const [form, setForm] = useState({
    title: kr.title,
    metricType: kr.metricType,
    startValue: kr.startValue,
    targetValue: kr.targetValue,
    ownerId: kr.ownerId,
    weight: kr.weight,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    updateKeyResult(objectiveId, kr.id, {
      title: form.title.trim(),
      metricType: form.metricType,
      startValue: form.startValue,
      targetValue: form.targetValue,
      ownerId: form.ownerId,
      weight: form.weight,
    });
    addToast(`Updated key result: "${form.title.trim()}"`, 'success');
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--border-strong)', borderRadius: 6,
    color: 'var(--text-primary)', background: 'var(--bg-primary)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 };
  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <Modal open={open} onClose={onClose} title="Edit Key Result">
      <form onSubmit={handleSubmit} style={{ minWidth: 400 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Metric Type</label>
            <select style={inputStyle} value={form.metricType} onChange={e => setForm(f => ({ ...f, metricType: e.target.value as MetricType }))}>
              <option value="number">Number</option>
              <option value="percentage">Percentage</option>
              <option value="currency">Currency</option>
              <option value="binary">Binary (Done/Not done)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Weight</label>
            <input type="number" min={0} max={100} style={inputStyle} value={form.weight} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} />
          </div>
        </div>
        {form.metricType !== 'binary' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Start Value</label>
              <input type="number" style={inputStyle} value={form.startValue} onChange={e => setForm(f => ({ ...f, startValue: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>Target Value</label>
              <input type="number" style={inputStyle} value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: Number(e.target.value) }))} />
            </div>
          </div>
        )}
        <div style={fieldStyle}>
          <label style={labelStyle}>Owner</label>
          <select style={inputStyle} value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}>
            <option value="">Unassigned</option>
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 6 }}>
          <button type="button" onClick={onClose} style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-primary)', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 6, border: 'none', color: 'var(--bg-primary)', background: 'var(--app-accent, #2563EB)', cursor: 'pointer' }}>Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Key result row ──────────────────────────────────────────────── */
function KeyResultRow({ kr, objectiveId }: { kr: KeyResult; objectiveId: string }) {
  const { openCheckIn, updateKeyResult, removeKeyResult } = useOKRsStore();
  const addToast = useToastStore(s => s.addToast);
  const isAdmin = useIsAdmin();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const progress = calcKRProgress(kr.startValue, kr.currentValue, kr.targetValue);
  const lastCheckIn = kr.checkIns[kr.checkIns.length - 1];

  const cycleConfidence = () => {
    const cycle: OKRStatus[] = ['on_track', 'at_risk', 'off_track'];
    const next = cycle[(cycle.indexOf(kr.confidence) + 1) % cycle.length];
    updateKeyResult(objectiveId, kr.id, { confidence: next });
  };

  return (
    <>
      <div
        className="px-4 py-3 transition-colors duration-100 group/kr"
        style={{ borderBottom: '1px solid var(--border-light)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{kr.title}</p>
              {kr.weight > 0 && (
                <span
                  className="text-[10px] font-semibold rounded-[3px] px-1.5 py-[1px]"
                  style={{ background: 'var(--border-light)', color: 'var(--text-tertiary)' }}
                >
                  {kr.weight}%
                </span>
              )}
            </div>
            {lastCheckIn && (
              <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                {formatRelative(lastCheckIn.createdAt)} · &ldquo;{lastCheckIn.note.slice(0, 60)}{lastCheckIn.note.length > 60 ? '...' : ''}&rdquo;
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Avatar ownerId={kr.ownerId} size="xs" />
            <ConfPill confidence={kr.confidence} onToggle={cycleConfidence} />
            {isAdmin && (
              <button
                onClick={() => setEditOpen(true)}
                className="p-1 rounded-[4px] opacity-0 group-hover/kr:opacity-100 transition-all duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--app-accent, #2563EB)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--info-bg)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                title="Edit key result"
              >
                <Pencil size={11} />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="p-1 rounded-[4px] opacity-0 group-hover/kr:opacity-100 transition-all duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                title="Delete key result"
              >
                <Trash2 size={11} />
              </button>
            )}
            <button
              onClick={() => openCheckIn(kr.id)}
              className="text-[12px] font-semibold rounded-[4px] transition-all duration-150 whitespace-nowrap"
              style={{ padding: '3px 8px', color: 'var(--app-accent, #2563EB)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--info-bg)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              + Check-in
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono tabular-nums shrink-0" style={{ color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
            {formatKRValue(kr, kr.startValue)}
          </span>
          <div className="flex-1"><ProgressBar value={progress} height="xs" /></div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[12px] font-semibold font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatKRValue(kr, kr.currentValue)}
            </span>
            <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>/</span>
            <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {formatKRValue(kr, kr.targetValue)}
            </span>
            <span className="text-[11px] font-mono tabular-nums ml-1" style={{ color: 'var(--text-disabled)' }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      <EditKeyResultModal open={editOpen} onClose={() => setEditOpen(false)} kr={kr} objectiveId={objectiveId} />
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => { removeKeyResult(objectiveId, kr.id); addToast(`Deleted key result: "${kr.title}"`, 'info'); }}
        title="Delete Key Result"
        message={`Are you sure you want to delete "${kr.title}"? This action cannot be undone.`}
      />
    </>
  );
}

/* ── Add Key Result Modal ────────────────────────────────────────── */
function AddKeyResultModal({
  open,
  onClose,
  objectiveId,
  existingWeightSum,
  useWeighting,
}: {
  open: boolean;
  onClose: () => void;
  objectiveId: string;
  existingWeightSum: number;
  useWeighting: boolean;
}) {
  const { addKeyResult } = useOKRsStore();
  const addToast = useToastStore(s => s.addToast);
  const teamMembers = useSettingsStore(s => s.teamMembers);
  const [form, setForm] = useState({
    title: '',
    metricType: 'number' as MetricType,
    startValue: 0,
    targetValue: 100,
    ownerId: '',
    weight: useWeighting ? Math.max(0, 100 - existingWeightSum) : 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const remainingWeight = 100 - existingWeightSum;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Required';
    if (useWeighting && (form.weight < 0 || form.weight > remainingWeight)) errs.weight = `Must be between 0 and ${remainingWeight}`;
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const now = new Date().toISOString();
    const kr: KeyResult = {
      id: `kr-${Date.now()}`,
      objectiveId,
      title: form.title.trim(),
      ownerId: form.ownerId,
      metricType: form.metricType,
      startValue: form.startValue,
      currentValue: form.startValue,
      targetValue: form.targetValue,
      confidence: 'on_track',
      weight: useWeighting ? form.weight : 0,
      checkIns: [],
      createdAt: now,
      updatedAt: now,
    };
    addKeyResult(objectiveId, kr);
    addToast(`Added key result: "${kr.title}"`, 'success');
    setForm({ title: '', metricType: 'number', startValue: 0, targetValue: 100, ownerId: '', weight: useWeighting ? Math.max(0, remainingWeight - form.weight) : 0 });
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--border-strong)', borderRadius: 6,
    color: 'var(--text-primary)', background: 'var(--bg-primary)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 };
  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <Modal open={open} onClose={onClose} title="Add Key Result">
      <form onSubmit={handleSubmit} style={{ minWidth: 400 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Title *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.title ? '#EF4444' : 'var(--border-strong)' }}
            value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: '' })); }}
            placeholder="e.g., Increase monthly active users to 50K"
            autoFocus
          />
          {errors.title && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.title}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: useWeighting ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Metric Type</label>
            <select style={inputStyle} value={form.metricType} onChange={e => setForm(f => ({ ...f, metricType: e.target.value as MetricType }))}>
              <option value="number">Number</option>
              <option value="percentage">Percentage</option>
              <option value="currency">Currency</option>
              <option value="binary">Binary (Done/Not done)</option>
            </select>
          </div>
          {useWeighting && (
            <div>
              <label style={labelStyle}>Weight ({remainingWeight}% remaining)</label>
              <input
                type="number"
                min={0}
                max={remainingWeight}
                style={{ ...inputStyle, borderColor: errors.weight ? '#EF4444' : 'var(--border-strong)' }}
                value={form.weight}
                onChange={e => { setForm(f => ({ ...f, weight: Number(e.target.value) })); setErrors(er => ({ ...er, weight: '' })); }}
              />
              {errors.weight && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.weight}</p>}
            </div>
          )}
        </div>

        {form.metricType !== 'binary' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Start Value</label>
              <input type="number" style={inputStyle} value={form.startValue} onChange={e => setForm(f => ({ ...f, startValue: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>Target Value</label>
              <input type="number" style={inputStyle} value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: Number(e.target.value) }))} />
            </div>
          </div>
        )}

        <div style={fieldStyle}>
          <label style={labelStyle}>Owner</label>
          <select style={inputStyle} value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}>
            <option value="">Unassigned</option>
            {teamMembers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 6 }}>
          <button type="button" onClick={onClose}
            style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-primary)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit"
            style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 6, border: 'none', color: 'var(--bg-primary)', background: 'var(--app-accent, #2563EB)', cursor: 'pointer' }}>
            Add Key Result
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Objective card ──────────────────────────────────────────────── */
function ObjectiveCard({ obj }: { obj: Objective }) {
  const [expanded, setExpanded] = useState(true);
  const [addKROpen, setAddKROpen] = useState(false);
  const [editObjOpen, setEditObjOpen] = useState(false);
  const [deleteObjOpen, setDeleteObjOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(!!obj.password);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const { checkInModalKRId, closeCheckIn, deleteObjective } = useOKRsStore();
  const departments = useSettingsStore(s => s.departments);
  const addToast = useToastStore(s => s.addToast);
  const isAdmin = useIsAdmin();
  const progress = calcObjectiveProgress(obj.keyResults);
  const checkInKR = obj.keyResults.find(kr => kr.id === checkInModalKRId);
  const donutColor = obj.status === 'on_track' ? '#16A34A' : obj.status === 'at_risk' ? '#D97706' : '#DC2626';
  const dept = departments.find(d => d.name === obj.department);
  const weightSum = obj.keyResults.reduce((sum, kr) => sum + (kr.weight || 0), 0);
  const useWeighting = obj.useWeighting ?? (weightSum > 0);

  const PERIOD_TYPE_LABELS: Record<string, string> = {
    monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: 'Half-Yearly', annual: 'Annual',
  };

  return (
    <div
      className="card bg-white rounded-[7px] overflow-hidden group"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--card-shadow)' }}
    >
      <div
        className="flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors duration-100"
        onClick={() => {
          if (obj.password && isLocked) {
            setExpanded(true);
          } else {
            setExpanded(!expanded);
          }
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <div style={{ color: 'var(--text-disabled)' }}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>

        <div className="relative shrink-0">
          <DonutProgress value={progress} size={42} strokeWidth={4} color={donutColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-semibold font-mono" style={{ color: 'var(--text-tertiary)' }}>{progress}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{obj.title}</p>
            <OKRStatusBadge status={obj.status} size="sm" />
            {obj.isDraft && (
              <span className="text-[10px] font-semibold rounded-[3px] px-1.5 py-[1px]" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>
                DRAFT
              </span>
            )}
            <span
              className="text-[11px] font-mono px-2 py-[2px] rounded-[3px]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            >
              {obj.period}
            </span>
            {obj.periodType && (
              <span className="text-[10px] px-1.5 py-[1px] rounded-[3px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                {PERIOD_TYPE_LABELS[obj.periodType] || obj.periodType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {dept && (
              <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: dept.color }} />
                {dept.name}
              </span>
            )}
            {obj.description && (
              <p className="text-[12px] truncate max-w-xl" style={{ color: 'var(--text-muted)' }}>{obj.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {useWeighting && weightSum !== 100 && (
            <span className="text-[11px] flex items-center gap-1" style={{ color: '#D97706' }} title={`Weight total: ${weightSum}% (should be 100%)`}>
              <AlertCircle size={11} />
              {weightSum}%
            </span>
          )}
          {obj.password && (
            <span title={isLocked ? 'Password protected' : 'Unlocked'} style={{ color: isLocked ? '#D97706' : '#22C55E' }}>
              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </span>
          )}
          <span className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>{obj.keyResults.length} KRs</span>
          <Avatar ownerId={obj.ownerId} size="sm" />
          {isAdmin && (
            <button
              onClick={e => { e.stopPropagation(); setEditObjOpen(true); }}
              className="p-1.5 rounded-[4px] opacity-0 group-hover:opacity-100 transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--app-accent, #2563EB)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--info-bg)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              title="Edit objective"
            >
              <Pencil size={13} />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={e => { e.stopPropagation(); setDeleteObjOpen(true); }}
              className="p-1.5 rounded-[4px] opacity-0 group-hover:opacity-100 transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#DC2626'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              title="Delete objective"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-row)' }}>
          {obj.password && isLocked ? (
            <div className="px-6 py-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2" style={{ color: '#D97706' }}>
                <Lock size={16} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--warning-text)' }}>This objective is password protected</span>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (pwInput === obj.password) {
                    setIsLocked(false);
                    setPwError(false);
                    setPwInput('');
                  } else {
                    setPwError(true);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="password"
                  value={pwInput}
                  onChange={e => { setPwInput(e.target.value); setPwError(false); }}
                  placeholder="Enter password"
                  className="text-[13px] rounded-[5px] outline-none"
                  style={{
                    padding: '6px 10px',
                    border: `1px solid ${pwError ? '#EF4444' : 'var(--border-strong)'}`,
                    width: 200,
                  }}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="text-[12px] font-semibold rounded-[5px]"
                  style={{ padding: '6px 14px', background: 'var(--app-accent, #2563EB)', color: 'var(--bg-primary)', border: 'none', cursor: 'pointer' }}
                >
                  Unlock
                </button>
              </form>
              {pwError && <p className="text-[11px]" style={{ color: '#EF4444' }}>Incorrect password</p>}
            </div>
          ) : (
            <>
              {[...obj.keyResults].sort((a, b) => b.weight - a.weight).map(kr => (
                <KeyResultRow key={kr.id} kr={kr} objectiveId={obj.id} />
              ))}
              {obj.keyResults.length === 0 && (
                <p className="px-8 py-5 text-[13px]" style={{ color: 'var(--text-muted)' }}>No key results yet. Add one below.</p>
              )}
              {isAdmin && (
                <div
                  className="px-4 py-2.5"
                  style={{ borderTop: '1px solid var(--border-light)', background: 'var(--bg-secondary)' }}
                >
                  <button
                    onClick={() => setAddKROpen(true)}
                    className="text-[12px] font-semibold flex items-center gap-1 transition-colors duration-150"
                    style={{ color: 'var(--app-accent, #2563EB)' }}
                  >
                    <Plus size={12} /> Add Key Result
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {checkInKR && <CheckInModal kr={checkInKR} objectiveId={obj.id} onClose={closeCheckIn} />}

      <AddKeyResultModal
        open={addKROpen}
        onClose={() => setAddKROpen(false)}
        objectiveId={obj.id}
        existingWeightSum={weightSum}
        useWeighting={useWeighting}
      />

      <EditObjectiveModal open={editObjOpen} onClose={() => setEditObjOpen(false)} obj={obj} />

      <DeleteConfirmModal
        open={deleteObjOpen}
        onClose={() => setDeleteObjOpen(false)}
        onConfirm={() => { deleteObjective(obj.id); addToast(`Deleted "${obj.title}"`, 'info'); }}
        title="Delete Objective"
        message={`Are you sure you want to delete "${obj.title}" and all its key results? This action cannot be undone.`}
      />
    </div>
  );
}

/* ── Auto-detect default period ─────────────────────────────────── */
function getDefaultPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  // Quarter boundaries: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
  // If in the last month of the quarter (Mar, Jun, Sep, Dec), default to NEXT quarter
  const isLastMonthOfQuarter = month % 3 === 0;
  if (isLastMonthOfQuarter) {
    // Move to next quarter
    if (month === 12) return `${year + 1}-Q1`;
    return `${year}-Q${Math.floor(month / 3) + 1}`;
  }
  // Otherwise current quarter
  return `${year}-Q${Math.ceil(month / 3)}`;
}

/* ── New Objective Modal ────────────────────────────────────────── */
function NewObjectiveModal({ open, onClose, isDraft, defaultDepartment }: { open: boolean; onClose: () => void; isDraft: boolean; defaultDepartment?: string | null }) {
  const { addObjective } = useOKRsStore();
  const departments = useSettingsStore(s => s.departments);
  const teamMembers = useSettingsStore(s => s.teamMembers);
  const addToast = useToastStore(s => s.addToast);
  const defaultPeriod = getDefaultPeriod();
  const [form, setForm] = useState({
    title: '',
    description: '',
    period: defaultPeriod,
    periodType: 'quarterly' as PeriodType,
    department: defaultDepartment ?? '',
    ownerId: '',
    status: 'on_track' as OKRStatus,
    useWeighting: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync department default when prop changes or modal opens
  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, department: defaultDepartment ?? '' }));
    }
  }, [open, defaultDepartment]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const now = new Date().toISOString();
    const obj: Objective = {
      id: `obj-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      ownerId: form.ownerId,
      period: form.period,
      periodType: form.periodType,
      department: form.department,
      isDraft,
      status: form.status,
      useWeighting: form.useWeighting,
      keyResults: [],
      createdAt: now,
      updatedAt: now,
    };
    addObjective(obj);
    addToast(`Created ${isDraft ? 'draft ' : ''}objective: "${obj.title}"`, 'success');
    setForm({ title: '', description: '', period: defaultPeriod, periodType: 'quarterly', department: defaultDepartment ?? '', ownerId: '', status: 'on_track', useWeighting: true });
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid var(--border-strong)', borderRadius: 6,
    color: 'var(--text-primary)', background: 'var(--bg-primary)', outline: 'none',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 };
  const fieldStyle: React.CSSProperties = { marginBottom: 14 };

  return (
    <Modal open={open} onClose={onClose} title={isDraft ? 'New Draft Objective' : 'New Objective'}>
      <form onSubmit={handleSubmit} style={{ minWidth: 400 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Title *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.title ? '#EF4444' : 'var(--border-strong)' }}
            value={form.title}
            onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(e2 => ({ ...e2, title: '' })); }}
            placeholder="e.g., Increase user engagement by 30%"
            autoFocus
          />
          {errors.title && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.title}</p>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
          />
        </div>

        {/* Department */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Department</label>
          <select style={inputStyle} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
            <option value="">— None —</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Period</label>
            <select style={inputStyle} value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
              {(() => {
                const y = new Date().getFullYear();
                const years = [y, y + 1];
                const opts: { value: string; label: string }[] = [];
                for (const yr of years) {
                  opts.push({ value: `${yr}-Q1`, label: `${yr}-Q1` });
                  opts.push({ value: `${yr}-Q2`, label: `${yr}-Q2` });
                  opts.push({ value: `${yr}-Q3`, label: `${yr}-Q3` });
                  opts.push({ value: `${yr}-Q4`, label: `${yr}-Q4` });
                  opts.push({ value: `${yr}-H1`, label: `${yr}-H1` });
                  opts.push({ value: `${yr}-H2`, label: `${yr}-H2` });
                  opts.push({ value: `${yr}`, label: `${yr} (Annual)` });
                }
                return opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>);
              })()}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Period Type</label>
            <select style={inputStyle} value={form.periodType} onChange={e => setForm(f => ({ ...f, periodType: e.target.value as PeriodType }))}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as OKRStatus }))}>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="off_track">Off Track</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Owner</label>
            <select style={inputStyle} value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}>
              <option value="">Unassigned</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Weighting toggle */}
        <div style={fieldStyle}>
          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13 }}>
            <div
              onClick={() => setForm(f => ({ ...f, useWeighting: !f.useWeighting }))}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: form.useWeighting ? 'var(--app-accent, #2563EB)' : 'var(--text-disabled)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--bg-primary)',
                  position: 'absolute',
                  top: 2,
                  left: form.useWeighting ? 18 : 2,
                  transition: 'left 150ms',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Apply weighting to Key Results</span>
          </label>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            When enabled, each key result will have a weight that determines its contribution to the overall objective progress.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 6 }}>
          <button type="button" onClick={onClose}
            style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-primary)', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" className="btn-accent"
            style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 6, border: 'none', color: 'var(--bg-primary)', background: 'var(--app-accent, #2563EB)', cursor: 'pointer' }}>
            {isDraft ? 'Create Draft' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Department filter section ──────────────────────────────────── */
function DepartmentFilter({
  departments,
  selected,
  onSelect,
  unlockedDepts,
  onUnlock,
  passwordProtection,
}: {
  departments: { id: string; name: string; color: string; password?: string }[];
  selected: string | null;
  onSelect: (dept: string | null) => void;
  unlockedDepts: Set<string>;
  onUnlock: (deptName: string) => void;
  passwordProtection: boolean;
}) {
  const [pwPromptDept, setPwPromptDept] = useState<string | null>(null);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  const handleDeptClick = (d: { name: string; password?: string }) => {
    if (selected === d.name) {
      onSelect(null);
      return;
    }
    if (passwordProtection && d.password && !unlockedDepts.has(d.name)) {
      setPwPromptDept(d.name);
      setPwInput('');
      setPwError(false);
    } else {
      onSelect(d.name);
    }
  };

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dept = departments.find(d => d.name === pwPromptDept);
    if (dept && pwInput === dept.password) {
      onUnlock(dept.name);
      onSelect(dept.name);
      setPwPromptDept(null);
      setPwInput('');
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        {!passwordProtection && (
          <button
            onClick={() => onSelect(null)}
            className="px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all duration-150"
            style={selected === null
              ? { background: 'var(--app-accent, #2563EB)', color: 'var(--bg-primary)' }
              : { color: 'var(--text-tertiary)' }
            }
            onMouseEnter={e => { if (selected !== null) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)'; }}
            onMouseLeave={e => { if (selected !== null) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            All
          </button>
        )}
        {departments.map(d => (
          <button
            key={d.id}
            onClick={() => handleDeptClick(d)}
            className="px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all duration-150 flex items-center gap-1.5"
            style={selected === d.name
              ? { background: d.color + '18', color: d.color, border: `1px solid ${d.color}40` }
              : { color: 'var(--text-tertiary)', border: '1px solid transparent' }
            }
            onMouseEnter={e => { if (selected !== d.name) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)'; }}
            onMouseLeave={e => { if (selected !== d.name) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <span className="w-[6px] h-[6px] rounded-full inline-block" style={{ background: d.color }} />
            {d.name}
            {passwordProtection && d.password && !unlockedDepts.has(d.name) && <Lock size={10} style={{ marginLeft: 2, opacity: 0.5 }} />}
          </button>
        ))}
      </div>

      {/* Password prompt modal */}
      <Modal open={!!pwPromptDept} onClose={() => setPwPromptDept(null)} title={`Unlock ${pwPromptDept}`} size="sm">
        <form onSubmit={handlePwSubmit}>
          <p className="text-[13px] mb-3" style={{ color: 'var(--text-secondary)' }}>
            This department is password protected. Enter the password to view its OKRs.
          </p>
          <div className="mb-3">
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false); }}
              placeholder="Enter password"
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                border: `1px solid ${pwError ? '#EF4444' : 'var(--border-strong)'}`,
                borderRadius: 6,
                outline: 'none',
              }}
              autoComplete="off"
            />
            {pwError && <p className="text-[11px] mt-1" style={{ color: '#EF4444' }}>Incorrect password</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPwPromptDept(null)}
              style={{ fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-primary)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ fontSize: 13, fontWeight: 600, padding: '7px 16px', borderRadius: 6, border: 'none', color: 'var(--bg-primary)', background: 'var(--app-accent, #2563EB)', cursor: 'pointer' }}
            >
              Unlock
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/* ── Dashboard View ──────────────────────────────────────────────── */
function OKRDashboard({ objectives }: { objectives: Objective[] }) {
  const departments = useSettingsStore(s => s.departments);
  const teamMembers = useSettingsStore(s => s.teamMembers);
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterOwner, setFilterOwner] = useState<string>('');

  const liveObjectives = objectives.filter(o => !o.isDraft);
  const filtered = liveObjectives
    .filter(o => !filterDept || o.department === filterDept)
    .filter(o => !filterPeriod || o.period === filterPeriod)
    .filter(o => !filterStatus || o.status === filterStatus)
    .filter(o => !filterOwner || o.ownerId === filterOwner);

  const totalOKRs = filtered.length;
  const avgProgress = totalOKRs > 0
    ? Math.round(filtered.reduce((sum, o) => sum + calcObjectiveProgress(o.keyResults), 0) / totalOKRs)
    : 0;
  const atRiskCount = filtered.filter(o => o.status === 'at_risk' || o.status === 'off_track').length;
  const completedCount = filtered.filter(o => calcObjectiveProgress(o.keyResults) >= 100).length;

  // Department performance
  const deptPerf = departments
    .map(dept => {
      const deptObjs = filtered.filter(o => o.department === dept.name);
      if (deptObjs.length === 0) return null;
      const avg = Math.round(deptObjs.reduce((s, o) => s + calcObjectiveProgress(o.keyResults), 0) / deptObjs.length);
      const completed = deptObjs.filter(o => calcObjectiveProgress(o.keyResults) >= 100).length;
      return { name: dept.name, color: dept.color, count: deptObjs.length, completed, avgProgress: avg };
    })
    .filter(Boolean) as Array<{ name: string; color: string; count: number; completed: number; avgProgress: number }>;

  // Also include objectives with no department
  const noDeptObjs = filtered.filter(o => !o.department);
  if (noDeptObjs.length > 0) {
    const avg = Math.round(noDeptObjs.reduce((s, o) => s + calcObjectiveProgress(o.keyResults), 0) / noDeptObjs.length);
    const completed = noDeptObjs.filter(o => calcObjectiveProgress(o.keyResults) >= 100).length;
    deptPerf.push({ name: 'No Department', color: '#9CA3AF', count: noDeptObjs.length, completed, avgProgress: avg });
  }

  const atRiskOKRs = filtered.filter(o => o.status === 'at_risk' || o.status === 'off_track');
  const completedOKRs = filtered.filter(o => calcObjectiveProgress(o.keyResults) >= 100);

  const periods = [...new Set(liveObjectives.map(o => o.period))];
  const owners = [...new Set(liveObjectives.map(o => o.ownerId))];

  const selectStyle: React.CSSProperties = {
    fontSize: 13, padding: '6px 28px 6px 10px', borderRadius: 7,
    border: '1px solid var(--border-medium)', background: 'var(--bg-primary)', color: 'var(--text-secondary)',
    cursor: 'pointer', outline: 'none', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  };

  const getMemberName = (id: string) => teamMembers.find(m => m.id === id)?.name ?? id;

  return (
    <div className="flex-1 overflow-auto" style={{ background: 'var(--bg-tertiary)' }}>
      <div className="p-6 max-w-[1200px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>OKR Dashboard</h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Organization-wide OKR progress overview</p>
        </div>

        {/* Filters */}
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3 flex-wrap" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Filter size={14} style={{ color: 'var(--text-tertiary)' }} />
            Filters:
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} style={selectStyle}>
            <option value="">All Quarters</option>
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="off_track">Off Track</option>
          </select>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={selectStyle}>
            <option value="">All Owners</option>
            {owners.map(id => <option key={id} value={id}>{getMemberName(id)}</option>)}
          </select>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Total OKRs', value: totalOKRs, icon: Target, iconBg: '#EDE9FE', iconColor: '#7C3AED' },
            { label: 'Avg Progress', value: `${avgProgress}%`, icon: BarChart3, iconBg: '#F3E8FF', iconColor: '#9333EA' },
            { label: 'At Risk', value: atRiskCount, icon: AlertTriangle, iconBg: '#FFF7ED', iconColor: '#EA580C' },
            { label: 'Completed', value: completedCount, icon: CheckCircle2, iconBg: '#ECFDF5', iconColor: '#059669' },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-5 flex items-center justify-between" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-[12px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>{card.label}</p>
                <p className="text-[28px] font-bold" style={{ color: card.iconColor, letterSpacing: '-0.02em' }}>{card.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.iconBg }}>
                <card.icon size={20} style={{ color: card.iconColor }} />
              </div>
            </div>
          ))}
        </div>

        {/* Department Performance */}
        {deptPerf.length > 0 && (
          <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h2 className="text-[15px] font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span style={{ fontSize: 16 }}>🏢</span> Department Performance
            </h2>
            <div className="space-y-5">
              {deptPerf.map(dept => (
                <div key={dept.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: dept.color }} />
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{dept.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px]">
                      <span style={{ color: 'var(--text-tertiary)' }}>{dept.count} OKRs</span>
                      <span style={{ color: '#059669' }}>{dept.completed} completed</span>
                      <span className="font-semibold" style={{ color: '#7C3AED' }}>{dept.avgProgress}%</span>
                    </div>
                  </div>
                  <div className="relative">
                    {/* Road / track */}
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${dept.avgProgress}%`, background: dept.color }}
                      />
                    </div>
                    {/* Car indicator */}
                    <div
                      className="absolute transition-all duration-700 ease-out"
                      style={{
                        left: `${dept.avgProgress}%`,
                        top: '50%',
                        transform: `translate(-50%, -50%)${dept.avgProgress < 100 ? ' scaleX(-1)' : ''}`,
                        fontSize: dept.avgProgress >= 100 ? 20 : 16,
                        lineHeight: 1,
                        filter: dept.avgProgress >= 100 ? 'drop-shadow(0 0 4px gold)' : 'none',
                      }}
                      title={`${dept.avgProgress}% progress`}
                    >
                      {dept.avgProgress >= 100 ? '🏁' : '🏎️'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* At Risk + Recently Completed */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[14px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <AlertTriangle size={15} style={{ color: '#EA580C' }} /> At Risk OKRs ({atRiskOKRs.length})
            </h3>
            {atRiskOKRs.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>No at-risk OKRs</p>
            ) : (
              <div className="space-y-2">
                {atRiskOKRs.slice(0, 5).map(obj => {
                  const prog = calcObjectiveProgress(obj.keyResults);
                  return (
                    <div key={obj.id} className="p-3 rounded-lg" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(234,179,8,0.2)' }}>
                      <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{obj.title}</p>
                      <div className="flex items-center gap-2">
                        <OKRStatusBadge status={obj.status} />
                        <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{obj.department}</span>
                        <span className="text-[11px] font-semibold ml-auto" style={{ color: '#EA580C' }}>{prog}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <h3 className="text-[14px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <CheckCircle2 size={15} style={{ color: '#059669' }} /> Recently Completed ({completedOKRs.length})
            </h3>
            {completedOKRs.length === 0 ? (
              <p className="text-[13px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>No completed OKRs</p>
            ) : (
              <div className="space-y-2">
                {completedOKRs.slice(0, 5).map(obj => (
                  <div key={obj.id} className="p-3 rounded-lg" style={{ background: 'var(--success-bg)', border: '1px solid rgba(5,150,105,0.15)' }}>
                    <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{obj.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#D1FAE5', color: '#059669' }}>Complete</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{obj.department}</span>
                      <span className="text-[11px] font-semibold ml-auto" style={{ color: '#059669' }}>100%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function OKRsPage() {
  const { objectives, filterPeriod, setFilterPeriod } = useOKRsStore();
  const departments = useSettingsStore(s => s.departments);
  // Password protection is active if ANY department has a password set
  const okrPasswordProtection = departments.some(d => !!d.password);
  const [newObjOpen, setNewObjOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'live' | 'draft'>('dashboard');
  const [filterDept, setFilterDept] = useState<string | null>(null);
  const isAdmin = useIsAdmin();
  const [unlockedDepts, setUnlockedDepts] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = sessionStorage.getItem('northstar-unlocked-depts');
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });

  const handleUnlockDept = (deptName: string) => {
    setUnlockedDepts(prev => {
      const next = new Set([...prev, deptName]);
      try { sessionStorage.setItem('northstar-unlocked-depts', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const isLive = activeTab === 'live';
  const tabObjectives = activeTab === 'dashboard' ? [] : objectives.filter(obj => isLive ? !obj.isDraft : obj.isDraft);
  const periods = [...new Set(objectives.map(o => o.period))];

  // Auto-select first period when switching to Live/Draft and no period is set
  const effectivePeriod = filterPeriod ?? (periods.length > 0 ? periods[0] : null);
  // When password protection is on and departments exist, require a department selection
  const requiresDeptSelection = okrPasswordProtection && departments.length > 0 && !filterDept;
  const filtered = requiresDeptSelection ? [] : tabObjectives
    .filter(obj => !effectivePeriod || obj.period === effectivePeriod)
    .filter(obj => !filterDept || obj.department === filterDept);

  const handleTabSwitch = (tab: 'dashboard' | 'live' | 'draft') => {
    setActiveTab(tab);
    if (tab !== 'dashboard' && !filterPeriod && periods.length > 0) {
      setFilterPeriod(periods[0]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="toolbar flex items-center gap-3 px-4 py-2 shrink-0 flex-wrap"
        style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', minHeight: 44 }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Objectives & Key Results</span>
        <div className="w-px h-4" style={{ background: 'var(--border)' }} />

        {/* Dashboard / Live / Draft tabs */}
        <div
          className="flex items-center rounded-[5px] p-[3px] gap-[2px]"
          style={{ background: 'var(--border-light)', border: '1px solid var(--border-row)' }}
        >
          {(['dashboard', 'live', 'draft'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              className="flex items-center gap-1 rounded-[3px] text-[12px] font-medium transition-all duration-150 ease-out px-2.5 py-1"
              style={activeTab === tab
                ? { background: 'var(--bg-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)', color: 'var(--text-primary)' }
                : { color: 'var(--text-tertiary)' }
              }
            >
              {tab === 'dashboard' ? 'Dashboard' : tab === 'live' ? 'Live' : 'Draft'}
              {tab !== 'dashboard' && (
                <span
                  className="text-[10px] rounded-full px-1.5 py-[1px] ml-0.5"
                  style={{ background: activeTab === tab ? 'var(--border-row)' : 'transparent', color: 'var(--text-muted)' }}
                >
                  {objectives.filter(o => tab === 'live' ? !o.isDraft : o.isDraft).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab !== 'dashboard' && (
          <>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />

            {/* Period tabs */}
            <div className="flex items-center gap-0.5">
              {periods.map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPeriod(p)}
                  className="px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all duration-150"
                  style={effectivePeriod === p
                    ? { background: 'var(--app-accent, #2563EB)', color: 'var(--bg-primary)' }
                    : { color: 'var(--text-tertiary)' }
                  }
                  onMouseEnter={e => {
                    if (effectivePeriod !== p) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-subtle)';
                  }}
                  onMouseLeave={e => {
                    if (effectivePeriod !== p) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab !== 'dashboard' && (
          <>
            <div className="flex-1" />
            {isAdmin && (
              <Button variant="primary" size="sm" onClick={() => setNewObjOpen(true)}>
                <Plus size={13} /> {isLive ? 'New Objective' : 'New Draft'}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Dashboard view */}
      {activeTab === 'dashboard' && <OKRDashboard objectives={objectives} />}

      {/* Department filter bar (only for Live/Draft) */}
      {activeTab !== 'dashboard' && departments.length > 0 && (
        <div
          className="px-4 py-2 shrink-0"
          style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}
        >
          <DepartmentFilter departments={departments} selected={filterDept} onSelect={setFilterDept} unlockedDepts={unlockedDepts} onUnlock={handleUnlockDept} passwordProtection={okrPasswordProtection} />
        </div>
      )}

      {/* Content (Live/Draft only) */}
      {activeTab !== 'dashboard' && (
        <div className="flex-1 overflow-auto p-5 space-y-3" style={{ maxWidth: 1100 }}>
          {requiresDeptSelection ? (
            <div className="text-center py-16">
              <Lock size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Select a department to view OKRs
              </p>
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                OKRs are organised by department. Choose one above to get started.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[14px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                {tabObjectives.length === 0
                  ? (isLive ? 'No live objectives yet' : 'No draft objectives yet')
                  : 'No objectives match the current filters'}
              </p>
              <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
                {tabObjectives.length === 0
                  ? (isLive ? 'Create your first objective to start tracking key results.' : 'Create a draft objective to plan ahead.')
                  : 'Try selecting a different period or department.'}
              </p>
              {isAdmin && (
                <Button variant="primary" size="sm" onClick={() => setNewObjOpen(true)}>
                  <Plus size={13} /> {isLive ? 'New Objective' : 'New Draft'}
                </Button>
              )}
            </div>
          ) : (
            filtered.map(obj => <ObjectiveCard key={obj.id} obj={obj} />)
          )}
        </div>
      )}

      <NewObjectiveModal open={newObjOpen} onClose={() => setNewObjOpen(false)} isDraft={!isLive} defaultDepartment={filterDept} />
      <ProductTour tourKey="okrs" steps={OKRS_TOUR} />
    </div>
  );
}
