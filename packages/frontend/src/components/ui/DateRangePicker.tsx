import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import clsx from 'clsx';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presets = [
  { label: 'Last 24 hours', getValue: () => ({ startDate: subDays(new Date(), 1).toISOString(), endDate: new Date().toISOString() }) },
  { label: 'Last 7 days', getValue: () => ({ startDate: subDays(new Date(), 7).toISOString(), endDate: new Date().toISOString() }) },
  { label: 'Last 30 days', getValue: () => ({ startDate: subDays(new Date(), 30).toISOString(), endDate: new Date().toISOString() }) },
  { label: 'Last 90 days', getValue: () => ({ startDate: subDays(new Date(), 90).toISOString(), endDate: new Date().toISOString() }) },
  { label: 'This month', getValue: () => ({ startDate: startOfMonth(new Date()).toISOString(), endDate: new Date().toISOString() }) },
  { label: 'Last month', getValue: () => ({ startDate: startOfMonth(subMonths(new Date(), 1)).toISOString(), endDate: endOfMonth(subMonths(new Date(), 1)).toISOString() }) },
  { label: 'This year', getValue: () => ({ startDate: startOfYear(new Date()).toISOString(), endDate: new Date().toISOString() }) },
];

export default function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayLabel = () => {
    if (!value.startDate || !value.endDate) return 'Select date range';
    const s = format(new Date(value.startDate), 'MMM d');
    const e = format(new Date(value.endDate), 'MMM d, yyyy');
    return `${s} - ${e}`;
  };

  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm text-secondary-700 dark:text-secondary-300 hover:border-primary-500 transition-colors"
      >
        <Calendar className="w-4 h-4 text-secondary-400" />
        <span>{displayLabel()}</span>
        <ChevronDown className="w-4 h-4 text-secondary-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-xl z-20 p-3 animate-slide-up">
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    onChange(preset.getValue());
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="border-t border-secondary-200 dark:border-secondary-700 my-2" />
            <div className="space-y-2 p-1">
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={value.startDate ? format(new Date(value.startDate), 'yyyy-MM-dd') : ''}
                  onChange={(e) => onChange({ ...value, startDate: new Date(e.target.value).toISOString() })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={value.endDate ? format(new Date(value.endDate), 'yyyy-MM-dd') : ''}
                  onChange={(e) => onChange({ ...value, endDate: new Date(e.target.value).toISOString() })}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
