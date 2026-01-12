import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalMetric {
  label: string;
  current: number;
  goal: number;
  projected: number;
  daysRemaining: number;
  unit?: string;
  color?: string;
}

interface GoalProgressCardProps {
  metrics: GoalMetric[];
  periodLabel: string;
  className?: string;
}

function GoalItem({ metric }: { metric: GoalMetric }) {
  const progress = Math.min((metric.current / metric.goal) * 100, 100);
  const projectedProgress = Math.min((metric.projected / metric.goal) * 100, 150);
  const onTrack = metric.projected >= metric.goal;
  const achieved = metric.current >= metric.goal;

  const statusColor = achieved
    ? "text-green-600"
    : onTrack
    ? "text-blue-600"
    : "text-amber-600";

  const statusBg = achieved
    ? "bg-green-100 dark:bg-green-900/30"
    : onTrack
    ? "bg-blue-100 dark:bg-blue-900/30"
    : "bg-amber-100 dark:bg-amber-900/30";

  const StatusIcon = achieved ? CheckCircle2 : onTrack ? TrendingUp : AlertCircle;

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", statusBg)}>
            <StatusIcon className={cn("h-4 w-4", statusColor)} />
          </div>
          <span className="font-medium text-sm">{metric.label}</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold">{metric.current}</span>
          <span className="text-muted-foreground text-sm"> / {metric.goal}</span>
          {metric.unit && <span className="text-muted-foreground text-xs ml-1">{metric.unit}</span>}
        </div>
      </div>

      <div className="relative">
        <Progress value={progress} className="h-2" />
        {/* Projected marker */}
        {!achieved && projectedProgress > progress && projectedProgress <= 150 && (
          <div
            className="absolute top-0 h-2 w-0.5 bg-blue-500/50"
            style={{ left: `${Math.min(projectedProgress, 100)}%` }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-blue-500 border border-white" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {Math.round(progress)}% complete
        </span>
        {!achieved && (
          <div className={cn("flex items-center gap-1", statusColor)}>
            {onTrack ? (
              <>
                <TrendingUp className="h-3 w-3" />
                <span>On pace for {metric.projected}</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3" />
                <span>Projected: {metric.projected} ({Math.round((metric.projected / metric.goal) * 100)}%)</span>
              </>
            )}
          </div>
        )}
        {achieved && (
          <Badge variant="secondary" className="text-green-600 bg-green-100 dark:bg-green-900/30">
            Goal Achieved
          </Badge>
        )}
      </div>
    </div>
  );
}

export function GoalProgressCard({ metrics, periodLabel, className }: GoalProgressCardProps) {
  const achievedCount = metrics.filter(m => m.current >= m.goal).length;
  const onTrackCount = metrics.filter(m => m.projected >= m.goal).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">{periodLabel} Goals</CardTitle>
              <CardDescription>Track progress toward your targets</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{metrics[0]?.daysRemaining || 0} days left</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((metric, index) => (
          <GoalItem key={index} metric={metric} />
        ))}

        <div className="pt-2 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Summary</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {achievedCount} achieved
            </span>
            <span className="flex items-center gap-1 text-blue-600">
              <TrendingUp className="h-4 w-4" />
              {onTrackCount - achievedCount} on track
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
