'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOKRsStore } from '@/lib/store/okrsStore';
import type { KeyResult } from '@/lib/types';

interface CheckInModalProps {
  kr: KeyResult;
  objectiveId: string;
  onClose: () => void;
}

const fmt = (kr: KeyResult, v: number) =>
  kr.metricType === 'currency' ? `$${v.toLocaleString()}`
  : kr.metricType === 'percentage' ? `${v}%`
  : kr.metricType === 'binary' ? (v ? 'Done' : 'Not done')
  : String(v);

/* Design decision: form inputs use a clean border + focus state, no faux shadows.
   The label sits tight above — 2px gap, not a gap that breaks visual connection. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block text-[11px] font-semibold uppercase tracking-widest mb-1"
        style={{ color: '#9CA3AF', letterSpacing: '0.07em' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  fontSize: '13px',
  color: '#1C1917',
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: '5px',
  outline: 'none',
  transition: 'border-color 150ms ease-out',
} as const;

export function CheckInModal({ kr, objectiveId, onClose }: CheckInModalProps) {
  const [value, setValue] = useState(kr.currentValue);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { addCheckIn } = useOKRsStore();

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await addCheckIn(objectiveId, kr.id, { value, note });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Log Check-in">
      <div className="space-y-4">
        {/* KR name */}
        <div
          className="px-3 py-2.5 rounded-[5px]"
          style={{ background: '#FAFAF9', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          <p className="text-[13px] font-medium" style={{ color: '#1C1917' }}>{kr.title}</p>
        </div>

        {/* Current metrics */}
        <div
          className="flex items-center gap-4 py-2.5 px-3 rounded-[5px]"
          style={{ background: '#F5F4F2' }}
        >
          {[['Start', fmt(kr, kr.startValue)], ['Current', fmt(kr, kr.currentValue)], ['Target', fmt(kr, kr.targetValue)]].map(([l, v]) => (
            <div key={l}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>{l}</p>
              <p className="text-[13px] font-semibold font-mono mt-0.5" style={{ color: '#1C1917' }}>{v}</p>
            </div>
          ))}
        </div>

        {/* New value */}
        <Field label="New value">
          {kr.metricType === 'binary' ? (
            <select
              value={value}
              onChange={e => setValue(Number(e.target.value))}
              style={{ ...inputStyle }}
              onFocus={e => { (e.target as HTMLSelectElement).style.borderColor = '#2563EB'; }}
              onBlur={e => { (e.target as HTMLSelectElement).style.borderColor = 'rgba(0,0,0,0.12)'; }}
            >
              <option value={0}>Not done</option>
              <option value={1}>Done</option>
            </select>
          ) : (
            <input
              type="number"
              value={value}
              onChange={e => setValue(Number(e.target.value))}
              style={{ ...inputStyle }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#2563EB'; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(0,0,0,0.12)'; }}
            />
          )}
        </Field>

        {/* Note */}
        <Field label="Note (optional)">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="What drove this change? Any blockers?"
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#2563EB'; }}
            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = 'rgba(0,0,0,0.12)'; }}
          />
        </Field>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Check-in'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
