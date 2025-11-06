'use client';

import { format, startOfYear, eachDayOfInterval, isSameDay, subDays } from 'date-fns';

interface ActivityHeatmapProps {
  data: Record<string, number>;
  className?: string;
  weeks?: number;
}

export function ActivityHeatmap({
  data,
  className = '',
  weeks = 52,
}: ActivityHeatmapProps) {
  const now = new Date();
  const startDate = subDays(now, weeks * 7);
  const days = eachDayOfInterval({ start: startDate, end: now });

  // Get max value for color intensity
  const maxValue = Math.max(...Object.values(data), 1);

  // Group days by week
  const weeksData: Array<Array<{ date: Date; value: number }>> = [];
  let currentWeek: Array<{ date: Date; value: number }> = [];

  days.forEach((day, index) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const value = data[dateKey] || 0;

    currentWeek.push({ date: day, value });

    // Start new week on Sunday (or if we have 7 days)
    if (day.getDay() === 0 || currentWeek.length === 7) {
      weeksData.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Add remaining days
  if (currentWeek.length > 0) {
    weeksData.push(currentWeek);
  }

  const getColor = (value: number): string => {
    if (value === 0) return 'bg-slate-100';
    const intensity = value / maxValue;
    if (intensity < 0.25) return 'bg-green-200';
    if (intensity < 0.5) return 'bg-green-400';
    if (intensity < 0.75) return 'bg-green-600';
    return 'bg-green-800';
  };

  const CustomTooltip = ({ date, value }: { date: Date; value: number }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
      <p className="text-xs font-medium text-slate-900">
        {format(date, 'MMM d, yyyy')}
      </p>
      <p className="text-xs text-slate-600">
        {value} {value === 1 ? 'activity' : 'activities'}
      </p>
    </div>
  );

  return (
    <div className={className}>
      <div className="flex gap-1">
        {weeksData.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => {
              const dateKey = format(day.date, 'yyyy-MM-dd');
              const value = data[dateKey] || 0;
              return (
                <div
                  key={dayIndex}
                  className={`h-3 w-3 rounded-sm transition-all hover:scale-125 ${getColor(value)}`}
                  title={`${format(day.date, 'MMM d, yyyy')}: ${value} activities`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-3 w-3 rounded-sm bg-slate-100" />
          <div className="h-3 w-3 rounded-sm bg-green-200" />
          <div className="h-3 w-3 rounded-sm bg-green-400" />
          <div className="h-3 w-3 rounded-sm bg-green-600" />
          <div className="h-3 w-3 rounded-sm bg-green-800" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

