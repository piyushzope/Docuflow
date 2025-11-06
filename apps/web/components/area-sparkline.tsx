interface AreaSparklineProps {
  values: number[];
  className?: string;
}

export function AreaSparkline({ values, className = '' }: AreaSparklineProps) {
  if (values.length === 0) {
    return null;
  }

  const max = Math.max(1, ...values);
  const width = 100;
  const height = 40;
  const padding = 4;
  const barGap = 2;

  // Calculate bar dimensions
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const totalBarWidth = availableWidth - (barGap * (values.length - 1));
  const barWidth = totalBarWidth / values.length;

  return (
    <div className={`overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {values.map((value, index) => {
          const normalizedValue = max > 0 ? value / max : 0;
          const barHeight = normalizedValue * availableHeight;
          const x = padding + index * (barWidth + barGap);
          const y = height - padding - barHeight;

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              fill="url(#barGradient)"
              rx="1"
              className="transition-all duration-300"
            />
          );
        })}
      </svg>
    </div>
  );
}


