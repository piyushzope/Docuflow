'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendData } from '@/lib/analytics';

interface EnhancedKpiCardProps {
  label: string;
  value: number | string;
  helper?: ReactNode;
  children?: ReactNode;
  className?: string;
  trend?: TrendData;
  href?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo';
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-600',
    gradient: 'from-green-500 to-green-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-600',
    gradient: 'from-red-500 to-red-600',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
    gradient: 'from-yellow-500 to-yellow-600',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-600',
  },
};

export function EnhancedKpiCard({
  label,
  value,
  helper,
  children,
  className = '',
  trend,
  href,
  icon,
  color = 'blue',
  onClick,
}: EnhancedKpiCardProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const colors = colorClasses[color];
  const isClickable = href || onClick;

  // Animate number counting
  useEffect(() => {
    if (typeof value === 'number') {
      setIsAnimating(true);
      const duration = 1000; // 1 second
      const startValue = 0;
      const endValue = value;
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);

        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
          setIsAnimating(false);
        }
      };

      const timeoutId = setTimeout(() => {
        requestAnimationFrame(animate);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        setIsAnimating(false);
      };
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  const content = (
    <div
      className={`group flex h-full flex-col rounded-xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg border ${colors.border} animate-fade-in-up ${
        isClickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Header with icon and label */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg} transition-transform group-hover:scale-110`}>
              <div className={colors.icon}>{icon}</div>
            </div>
          )}
          <div className="text-sm font-medium text-slate-600">{label}</div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.isPositive ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            <span>{Math.abs(trend.changePercent)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div 
        className={`text-3xl font-bold transition-all duration-300 ${isAnimating ? 'scale-110' : 'scale-100'} ${colors.text}`}
        style={{
          transition: 'transform 0.3s ease-out, color 0.3s ease-out',
        }}
      >
        {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
      </div>

      {/* Helper text */}
      {helper && (
        <div className="mt-2 text-xs text-slate-500">{helper}</div>
      )}

      {/* Trend details */}
      {trend && (
        <div className="mt-2 text-xs text-slate-500">
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.change)} from previous period
        </div>
      )}

      {/* Children (charts, etc.) */}
      {children ? (
        <div className="mt-auto pt-4">{children}</div>
      ) : (
        <div className="mt-auto pt-4" aria-hidden="true" />
      )}

      {/* Hover indicator */}
      {isClickable && (
        <div className="mt-4 flex items-center text-xs font-medium text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
          {href ? (
            <>
              View details
              <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          ) : (
            'Click to view'
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}

