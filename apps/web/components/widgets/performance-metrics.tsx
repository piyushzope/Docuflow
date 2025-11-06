'use client';

import { PerformanceMetrics } from '@/lib/analytics';

interface PerformanceMetricsWidgetProps {
  metrics: PerformanceMetrics;
  className?: string;
}

export function PerformanceMetricsWidget({
  metrics,
  className = '',
}: PerformanceMetricsWidgetProps) {
  const formatDays = (days: number) => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${days.toFixed(1)} ${days === 1 ? 'day' : 'days'}`;
  };

  const metricCards = [
    {
      label: 'Avg Completion Time',
      value: formatDays(metrics.averageCompletionTime),
      helper: 'Time from creation to completion',
      color: 'blue',
    },
    {
      label: 'Avg Response Time',
      value: formatDays(metrics.averageResponseTime),
      helper: 'Time from sent to first document',
      color: 'purple',
    },
    {
      label: 'Completion Rate',
      value: `${metrics.completionRate}%`,
      helper: 'Percentage of completed requests',
      color: 'green',
    },
    {
      label: 'On-Time Rate',
      value: `${metrics.onTimeCompletionRate}%`,
      helper: 'Completed before due date',
      color: 'indigo',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
        };
      case 'purple':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
        };
      case 'green':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
        };
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
        };
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Performance Metrics</h3>
      <div className="grid grid-cols-2 gap-4">
        {metricCards.map((card) => {
          const colors = getColorClasses(card.color);
          return (
            <div
              key={card.label}
              className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}
            >
              <div className="text-xs font-medium text-slate-600">{card.label}</div>
              <div className={`mt-2 text-2xl font-bold ${colors.text}`}>{card.value}</div>
              <div className="mt-1 text-xs text-slate-500">{card.helper}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

