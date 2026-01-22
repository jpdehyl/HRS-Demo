import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/sparkline";
import { Loader2, ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export interface AnomalyData {
  isAnomaly: boolean;
  type: "spike" | "drop" | null;
  severity: number;
}

interface HeroMetricProps {
  label: string;
  value: number | string;
  trend?: number;
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  accentColor?: "primary" | "green" | "blue" | "purple" | "amber";
  sparklineData?: number[];
  anomaly?: AnomalyData;
  onClick?: () => void;
}

const colorMap: Record<string, string> = {
  primary: "hsl(var(--primary))",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
};

export function HeroMetric({
  label,
  value,
  trend,
  icon,
  prefix = "",
  suffix = "",
  loading = false,
  accentColor = "primary",
  sparklineData,
  anomaly,
  onClick,
}: HeroMetricProps) {
  // Determine if we should show anomaly styling
  const showAnomaly = anomaly?.isAnomaly && anomaly.severity > 0.3;
  const anomalyColor = anomaly?.type === "spike"
    ? "ring-green-500 bg-green-50 dark:bg-green-950/20"
    : "ring-amber-500 bg-amber-50 dark:bg-amber-950/20";

  return (
    <Card
      className={`border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 ${showAnomaly ? `ring-2 ${anomalyColor}` : ''} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <CardContent className="pt-6 pb-6 text-center relative">
        {showAnomaly && (
          <div className={`absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold rounded ${anomaly?.type === "spike" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
            {anomaly?.type === "spike" ? "HIGH" : "LOW"}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-36">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-5xl font-bold tracking-tight" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
              {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            {sparklineData && sparklineData.length > 0 && (
              <div className="pt-2 px-4">
                <Sparkline
                  data={sparklineData}
                  color={colorMap[accentColor]}
                  height={28}
                  showTrend={true}
                />
              </div>
            )}
            {trend !== undefined && trend !== 0 && (
              <div className={`inline-flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {trend > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(trend)}% vs prev
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Additional utility components extracted from dashboard

export function FunnelStage({
  label,
  value,
  percentage,
  color,
  onClick
}: {
  label: string;
  value: number;
  percentage: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div className={`flex-1 text-center ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div
        className={`mx-auto mb-2 flex items-center justify-center rounded-md text-white font-bold text-xl ${onClick ? 'hover:opacity-80 transition-opacity' : ''}`}
        style={{
          backgroundColor: color,
          width: `${Math.max(60, percentage * 1.5)}%`,
          height: "48px",
          transition: "width 0.5s ease-out, opacity 0.2s ease"
        }}
      >
        {value}
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{percentage}%</p>
    </div>
  );
}

export function LeaderboardRow({
  rank,
  name,
  qualified,
  meetings,
  calls,
  connectRate,
  onClick
}: {
  rank: number;
  name: string;
  qualified: number;
  meetings: number;
  calls: number;
  connectRate: number;
  onClick?: () => void;
}) {
  const isTopThree = rank <= 3;
  const rankBg = rank === 1
    ? "bg-gradient-to-br from-yellow-400 to-orange-500"
    : rank === 2
    ? "bg-gradient-to-br from-gray-300 to-gray-400"
    : rank === 3
    ? "bg-gradient-to-br from-orange-300 to-orange-400"
    : "bg-muted";

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-all duration-200 border-b border-border last:border-0 ${onClick ? 'cursor-pointer' : ''}`}
      data-testid={`leaderboard-row-${rank}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${rankBg} ${isTopThree ? 'text-white' : ''} font-semibold`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base truncate">{name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span>{calls} calls</span>
          <span>-</span>
          <span className="text-green-600 font-medium">{connectRate}% connect</span>
        </div>
      </div>
      <div className="text-center min-w-[80px]">
        <p className="text-2xl font-bold text-green-600">{qualified}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">qualified</p>
      </div>
      <div className="text-center min-w-[80px]">
        <p className="text-2xl font-bold text-blue-600">{meetings}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">meetings</p>
      </div>
    </div>
  );
}

export function ActionItem({
  icon,
  title,
  subtitle,
  href,
  variant = "default",
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  variant?: "default" | "warning" | "success";
  onClick?: () => void;
}) {
  const variantClasses = {
    default: "bg-muted/50",
    warning: "bg-yellow-50 dark:bg-yellow-950/30",
    success: "bg-green-50 dark:bg-green-950/30",
  };

  const content = (
    <div
      className={`flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer ${variantClasses[variant]}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
