/**
 * WorkScheduleEditor — 7-row work schedule input.
 *
 * UI: hours stepper 0–12, step 0.5.
 * API: Zod validates 0–24, so the API is wider than the UI cap intentionally.
 *
 * Off day = hours === 0.
 */

import React from 'react';

const DAYS = [
  { key: '0', label: 'Sunday', abbr: 'Sun' },
  { key: '1', label: 'Monday', abbr: 'Mon' },
  { key: '2', label: 'Tuesday', abbr: 'Tue' },
  { key: '3', label: 'Wednesday', abbr: 'Wed' },
  { key: '4', label: 'Thursday', abbr: 'Thu' },
  { key: '5', label: 'Friday', abbr: 'Fri' },
  { key: '6', label: 'Saturday', abbr: 'Sat' },
] as const;

export type WorkScheduleValue = Record<string, number>;

interface WorkScheduleEditorProps {
  value: WorkScheduleValue;
  onChange: (v: WorkScheduleValue) => void;
  disabled?: boolean;
}

const DEFAULT_8H_SUN_OFF: WorkScheduleValue = { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 8 };
const DEFAULT_8H_SAT_SUN_OFF: WorkScheduleValue = { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 0 };

export function WorkScheduleEditor({ value, onChange, disabled = false }: WorkScheduleEditorProps) {
  function setDay(dayKey: string, hours: number) {
    const clamped = Math.min(12, Math.max(0, hours));
    onChange({ ...value, [dayKey]: clamped });
  }

  function applyPreset(preset: WorkScheduleValue) {
    onChange(preset);
  }

  function applyUniform(hours: number) {
    const next: WorkScheduleValue = {};
    for (const d of DAYS) next[d.key] = Math.min(12, Math.max(0, hours));
    onChange(next);
  }

  const totalHoursPerWeek = DAYS.reduce((acc, d) => acc + (value[d.key] ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Quick presets */}
      <div className="flex gap-2 flex-wrap mb-1">
        <button
          type="button"
          onClick={() => applyPreset(DEFAULT_8H_SUN_OFF)}
          disabled={disabled}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
        >
          8h · Sun off
        </button>
        <button
          type="button"
          onClick={() => applyPreset(DEFAULT_8H_SAT_SUN_OFF)}
          disabled={disabled}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
        >
          8h · Sat+Sun off
        </button>
        <button
          type="button"
          onClick={() => applyUniform(8)}
          disabled={disabled}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
        >
          8h all 7 days
        </button>
        <button
          type="button"
          onClick={() => applyUniform(0)}
          disabled={disabled}
          className="text-xs px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 transition-colors"
        >
          Clear all
        </button>
      </div>

      {/* Day rows */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {DAYS.map(({ key, abbr }, i) => {
          const hours = value[key] ?? 0;
          const isOff = hours === 0;
          return (
            <div
              key={key}
              className={`flex items-center gap-3 px-4 py-2.5 ${i < DAYS.length - 1 ? 'border-b border-slate-100' : ''} ${isOff ? 'bg-slate-50' : 'bg-white'}`}
            >
              <span className={`w-8 text-xs font-medium ${isOff ? 'text-slate-400' : 'text-slate-700'}`}>
                {abbr}
              </span>

              {/* Off badge or hours input */}
              {isOff ? (
                <span className="flex-1 text-xs text-slate-400 italic">Off</span>
              ) : (
                <span className="flex-1 text-xs text-slate-600">{hours}h</span>
              )}

              {/* Stepper */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDay(key, Math.max(0, hours - 0.5))}
                  disabled={disabled || hours <= 0}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-sm font-bold flex items-center justify-center transition-colors"
                  aria-label={`Decrease ${abbr} hours`}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={12}
                  step={0.5}
                  value={hours}
                  onChange={(e) => setDay(key, parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  aria-label={`${abbr} work hours`}
                  className="w-12 text-center text-xs border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setDay(key, Math.min(12, hours + 0.5))}
                  disabled={disabled || hours >= 12}
                  className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-sm font-bold flex items-center justify-center transition-colors"
                  aria-label={`Increase ${abbr} hours`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 text-right">{totalHoursPerWeek}h / week</p>
    </div>
  );
}
