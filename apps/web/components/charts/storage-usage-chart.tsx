'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { formatFileSize } from '@/lib/utils';

interface StorageUsageChartProps {
  data: Array<{ provider: string; count: number; totalSize: number; percentage: number }>;
  className?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function StorageUsageChart({
  data,
  className = '',
}: StorageUsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex h-64 items-center justify-center ${className}`}>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.provider,
    count: item.count,
    size: item.totalSize,
    sizeFormatted: formatFileSize(item.totalSize),
    percentage: item.percentage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-medium text-slate-900">{data.name}</p>
          <p className="text-sm text-slate-600">
            {data.payload.sizeFormatted} ({data.payload.percentage}%)
          </p>
          <p className="text-xs text-slate-500">
            {data.payload.count} {data.payload.count === 1 ? 'document' : 'documents'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={80}
            tickFormatter={(value) => formatFileSize(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="size"
            radius={[8, 8, 0, 0]}
            animationDuration={800}
            name="Storage Used"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

