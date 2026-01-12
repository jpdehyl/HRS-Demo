import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
  showTrend?: boolean;
}

export function Sparkline({
  data,
  color = "hsl(var(--primary))",
  height = 24,
  className,
  showTrend = true
}: SparklineProps) {
  const { path, trend, min, max } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: "", trend: 0, min: 0, max: 0 };
    }

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;

    // Calculate trend (last value compared to first)
    const trendValue = data[data.length - 1] - data[0];

    // Width per point (100 / number of gaps between points)
    const width = 100;
    const pointWidth = width / (data.length - 1);

    // Generate SVG path
    const points = data.map((value, index) => {
      const x = index * pointWidth;
      const y = height - ((value - minVal) / range) * height;
      return `${x},${y}`;
    });

    // Create a smooth curve using line segments
    const pathD = points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point}`;
      return `${acc} L ${point}`;
    }, "");

    return { path: pathD, trend: trendValue, min: minVal, max: maxVal };
  }, [data, height]);

  if (!data || data.length < 2) {
    return null;
  }

  // Determine color based on trend
  const trendColor = showTrend
    ? trend > 0
      ? "#22c55e" // green for positive
      : trend < 0
      ? "#ef4444" // red for negative
      : color
    : color;

  return (
    <div className={cn("w-full", className)}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Gradient fill under the line */}
        <defs>
          <linearGradient id={`sparkline-gradient-${data.length}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity={0.2} />
            <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={`${path} L 100,${height} L 0,${height} Z`}
          fill={`url(#sparkline-gradient-${data.length})`}
        />

        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke={trendColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* End point dot */}
        <circle
          cx="100"
          cy={height - ((data[data.length - 1] - (Math.min(...data))) / (Math.max(...data) - Math.min(...data) || 1)) * height}
          r="2"
          fill={trendColor}
          className="animate-pulse"
        />
      </svg>
    </div>
  );
}

interface SparklineBarProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}

export function SparklineBar({
  data,
  color = "hsl(var(--primary))",
  height = 24,
  className
}: SparklineBarProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxVal = Math.max(...data, 1);
  const barWidth = 100 / data.length;
  const gap = 1;

  return (
    <div className={cn("w-full", className)}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        {data.map((value, index) => {
          const barHeight = (value / maxVal) * height;
          const x = index * barWidth + gap / 2;
          const width = barWidth - gap;
          const y = height - barHeight;

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={width}
              height={barHeight}
              fill={color}
              opacity={0.7 + (index / data.length) * 0.3}
              rx="1"
            />
          );
        })}
      </svg>
    </div>
  );
}
