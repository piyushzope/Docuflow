'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { StatusDistribution } from '@/lib/analytics';

interface StatusDistributionChartProps {
  data: StatusDistribution[];
  className?: string;
}

const COLORS = {
  pending: '#eab308', // yellow-500
  sent: '#3b82f6', // blue-500
  received: '#8b5cf6', // purple-500
  missing_files: '#f97316', // orange-500
  completed: '#10b981', // green-500
  expired: '#ef4444', // red-500
  verifying: '#06b6d4', // cyan-500
};

const DEFAULT_COLOR = '#94a3b8'; // slate-400

export function StatusDistributionChart({
  data,
  className = '',
}: StatusDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex h-64 items-center justify-center ${className}`}>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value: item.count,
    percentage: item.percentage,
    color: COLORS[item.status as keyof typeof COLORS] || DEFAULT_COLOR,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="font-medium text-slate-900">{data.name}</p>
          <p className="text-sm text-slate-600">
            {data.value} requests ({data.payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for very small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={`${className} animate-fade-in`}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-sm text-slate-700">
                {value}: {entry.payload.value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

