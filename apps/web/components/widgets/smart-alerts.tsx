'use client';

import Link from 'next/link';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  timestamp?: string;
}

interface SmartAlertsProps {
  alerts: Alert[];
  className?: string;
}

export function SmartAlerts({ alerts, className = '' }: SmartAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Alerts</h3>
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">All systems operational</p>
          </div>
        </div>
      </div>
    );
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          message: 'text-red-800',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          message: 'text-yellow-800',
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

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Alerts</h3>
        {alerts.length > 3 && (
          <span className="text-xs text-slate-500">{alerts.length} active alerts</span>
        )}
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert) => {
          const styles = getAlertStyles(alert.type);
          return (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={styles.icon}>{getAlertIcon(alert.type)}</div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${styles.title}`}>{alert.title}</div>
                  <div className={`mt-1 text-sm ${styles.message}`}>{alert.message}</div>
                  {alert.timestamp && (
                    <div className="mt-2 text-xs text-slate-500">
                      {formatRelativeTime(alert.timestamp)}
                    </div>
                  )}
                  {alert.action && (
                    <Link
                      href={alert.action.href}
                      className={`mt-2 inline-block text-sm font-medium ${styles.icon} transition-colors hover:underline`}
                    >
                      {alert.action.label} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

