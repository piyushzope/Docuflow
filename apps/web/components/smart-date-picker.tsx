'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addDays, addBusinessDays, differenceInDays, isPast, isToday } from 'date-fns';

interface SmartDatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  minDate?: Date; // Minimum selectable date
  className?: string;
}

const QUICK_PRESETS = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
];

export default function SmartDatePicker({
  value,
  onChange,
  label = 'Due Date',
  required = false,
  minDate,
  className = '',
}: SmartDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [useBusinessDays, setUseBusinessDays] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const effectiveMinDate = minDate || today;

  // Calculate days until due date
  const daysUntilDue = selectedDate && !isPast(selectedDate)
    ? differenceInDays(selectedDate, today)
    : null;

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCalendar(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handlePresetClick = (days: number) => {
    const newDate = useBusinessDays
      ? addBusinessDays(today, days)
      : addDays(today, days);
    onChange(format(newDate, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const selected = new Date(dateValue);
      if (isPast(selected) && !isToday(selected)) {
        // Reset to today if past date selected
        onChange(format(today, 'yyyy-MM-dd'));
      } else {
        onChange(dateValue);
      }
    }
  };

  const handleCalendarDateClick = (date: Date) => {
    if (isPast(date) && !isToday(date)) return;
    onChange(format(date, 'yyyy-MM-dd'));
    setShowCalendar(false);
    setIsOpen(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = selectedDate?.getFullYear() || today.getFullYear();
    const month = selectedDate?.getMonth() || today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonth = selectedDate?.getMonth() || today.getMonth();
  const currentYear = selectedDate?.getFullYear() || today.getFullYear();

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentYear, currentMonth, 1);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    onChange(format(newDate, 'yyyy-MM-dd'));
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label
        htmlFor="due_date"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type="date"
          id="due_date"
          value={value}
          onChange={handleDateInputChange}
          min={format(effectiveMinDate, 'yyyy-MM-dd')}
          required={required}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Open date picker options"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {daysUntilDue !== null && value && (
        <p className="mt-1 text-xs text-gray-600">
          <span className="font-medium">{daysUntilDue}</span> {daysUntilDue === 1 ? 'day' : 'days'} until due
          {daysUntilDue <= 7 && (
            <span className="ml-2 text-orange-600 font-medium">⚠️ Soon</span>
          )}
        </p>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="business_days"
                  checked={useBusinessDays}
                  onChange={(e) => setUseBusinessDays(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="business_days"
                  className="text-sm text-gray-700"
                >
                  Business days only
                </label>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showCalendar ? 'Hide' : 'Show'} Calendar
              </button>
            </div>

            {showCalendar && (
              <div className="mb-4 border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => navigateMonth('prev')}
                    className="p-1 hover:bg-gray-100 rounded"
                    aria-label="Previous month"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {monthNames[currentMonth]} {currentYear}
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigateMonth('next')}
                    className="p-1 hover:bg-gray-100 rounded"
                    aria-label="Next month"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-gray-500 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, idx) => {
                    if (!date) {
                      return <div key={`empty-${idx}`} className="aspect-square" />;
                    }
                    const isSelected = value && format(date, 'yyyy-MM-dd') === value;
                    const isPastDate = isPast(date) && !isToday(date);
                    const isTodayDate = isToday(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => handleCalendarDateClick(date)}
                        disabled={isPastDate}
                        className={`
                          aspect-square rounded text-sm
                          ${isPastDate
                            ? 'text-gray-300 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-600 text-white font-semibold'
                            : isTodayDate
                            ? 'bg-blue-100 text-blue-900 font-medium'
                            : isWeekend && useBusinessDays
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700 mb-2">Quick Presets:</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handlePresetClick(preset.days)}
                    className="text-left px-3 py-2 text-sm rounded-md border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-gray-500 text-xs block mt-0.5">
                      {format(
                        useBusinessDays
                          ? addBusinessDays(today, preset.days)
                          : addDays(today, preset.days),
                        'MMM d, yyyy'
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

