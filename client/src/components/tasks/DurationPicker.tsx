import React, { useState, useEffect } from 'react';
import { formatDuration } from '../../utils/time';

export interface DurationPickerProps {
  value: number;
  onChange: (value: number) => void;
  onValidationChange?: (isValid: boolean) => void;
  id?: string;
}

const PRESETS = [
  { label: '10m', value: 10 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '4h', value: 240 },
];

export function DurationPicker({ value, onChange, onValidationChange, id }: DurationPickerProps) {
  const [localInput, setLocalInput] = useState(value ? value.toString() : '');
  const [error, setError] = useState<string | null>(null);

  // Sync local input with parent value changes (e.g., preset click or external load)
  useEffect(() => {
    if (value !== undefined) {
      const parsed = parseInt(localInput, 10);
      if (parsed !== value) {
        setLocalInput(value.toString());
        validate(value.toString());
      }
    }
  }, [value]);

  const validate = (valStr: string) => {
    if (!valStr.trim()) {
      setError('Duration is required');
      onValidationChange?.(false);
      return;
    }
    const parsed = parseInt(valStr, 10);
    if (isNaN(parsed) || !Number.isInteger(parsed)) {
      setError('Duration must be a valid integer');
      onValidationChange?.(false);
    } else if (parsed < 10 || parsed > 480) {
      setError('Duration must be between 10 min and 8 hours');
      onValidationChange?.(false);
    } else {
      setError(null);
      onValidationChange?.(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setLocalInput(valStr);
    validate(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && Number.isInteger(parsed)) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  };

  const handlePresetClick = (presetVal: number) => {
    setLocalInput(presetVal.toString());
    setError(null);
    onValidationChange?.(true);
    onChange(presetVal);
  };

  const numericValue = parseInt(localInput, 10);
  const isValid = !error && !isNaN(numericValue) && numericValue >= 10 && numericValue <= 480;

  const formatDurationText = (mins: number): string => {
    if (isNaN(mins) || mins <= 0) return '';
    return `= ${formatDuration(mins)}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id ?? 'duration-picker-input'} className="text-xs font-semibold text-slate-500">
          Duration *
        </label>
        {isValid && (
          <span className="text-xs font-semibold text-slate-500">
            {formatDurationText(numericValue)}
          </span>
        )}
      </div>
      <div className="relative flex-1">
        <input
          id={id ?? 'duration-picker-input'}
          type="number"
          min={10}
          max={480}
          value={localInput}
          onChange={handleInputChange}
          placeholder="Mins (e.g. 90)"
          className={`input w-full pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            error ? 'border-red-500 focus:ring-red-500' : ''
          }`}
        />
        <span className="absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-400 pointer-events-none select-none">
          min
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const isSelected = numericValue === preset.value && !error;
          return (
            <button
              key={preset.value}
              type="button"
              id={`duration-preset-${preset.value}`}
              onClick={() => handlePresetClick(preset.value)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p id={`${id ?? 'duration-picker-input'}-error`} className="text-[11px] text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
