import { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function KpiCard({ label, value, helper, children, className = '' }: KpiCardProps) {
  return (
    <div
      className={`group flex h-full flex-col rounded-xl bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
    >
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {helper && <div className="mt-2 text-xs text-slate-500">{helper}</div>}
      {children ? (
        <div className="mt-auto pt-4">{children}</div>
      ) : (
        <div className="mt-auto pt-4" aria-hidden="true" />
      )}
    </div>
  );
}


