'use client';

import { useState } from 'react';
import { TrendData, TimeSeriesDataPoint, detectAnomalies } from '@/lib/analytics';
import { formatRelativeTime } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  priority: number; // Higher = more important
}

interface InsightsPanelProps {
  insights: Insight[];
  trends?: TrendData[];
  timeSeriesData?: TimeSeriesDataPoint[];
  className?: string;
}

export function InsightsPanel({
  insights,
  trends,
  timeSeriesData,
  className = '',
}: InsightsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Detect anomalies if time series data is provided
  const anomalies = timeSeriesData
    ? detectAnomalies(timeSeriesData, 2).filter((point) => point.isAnomaly)
    : [];

  // Add anomaly insights
  const allInsights = [...insights];
  if (anomalies.length > 0) {
    allInsights.push({
      id: 'anomaly-detected',
      type: 'warning',
      title: 'Unusual Activity Detected',
      message: `Detected ${anomalies.length} unusual pattern${anomalies.length > 1 ? 's' : ''} in your data. This may indicate a spike or drop in activity.`,
      priority: 8,
    });
  }

  // Sort by priority
  const sortedInsights = allInsights.sort((a, b) => b.priority - a.priority);

  const getInsightStyles = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-900',
          message: 'text-green-800',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          message: 'text-yellow-800',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          message: 'text-red-800',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          message: 'text-blue-800',
        };
    }
  };

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (sortedInsights.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Insights</h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {expanded && (
          <div className="mt-4 rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-800">No insights at this time. Everything looks good!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">Insights</h3>
          {sortedInsights.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              {sortedInsights.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {sortedInsights.slice(0, 5).map((insight) => {
            const styles = getInsightStyles(insight.type);
            return (
              <div
                key={insight.id}
                className={`rounded-lg border p-4 transition-all hover:shadow-md ${styles.bg} ${styles.border}`}
              >
                <div className="flex items-start gap-3">
                  <div className={styles.icon}>{getInsightIcon(insight.type)}</div>
                  <div className="flex-1">
                    <div className={`text-sm font-semibold ${styles.title}`}>{insight.title}</div>
                    <div className={`mt-1 text-sm ${styles.message}`}>{insight.message}</div>
                    {insight.action && (
                      <a
                        href={insight.action.href}
                        className={`mt-2 inline-block text-sm font-medium ${styles.icon} transition-colors hover:underline`}
                      >
                        {insight.action.label} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

