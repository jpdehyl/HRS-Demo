import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Trophy, ChevronRight, Sparkles, RefreshCw } from "lucide-react";
import type { TimeRange } from "./time-range-selector";
import { cn } from "@/lib/utils";

interface DashboardInsight {
  id: string;
  type: "opportunity" | "warning" | "achievement" | "tip";
  title: string;
  message: string;
  metric?: string;
  action?: string;
  priority: number;
}

interface InsightsResponse {
  insights: DashboardInsight[];
  timeRange: string;
  generatedAt: string;
}

interface InsightsCardProps {
  timeRange: TimeRange;
  className?: string;
}

const typeConfig = {
  opportunity: {
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    badgeVariant: "default" as const,
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    badgeVariant: "destructive" as const,
  },
  achievement: {
    icon: Trophy,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    badgeVariant: "secondary" as const,
  },
  tip: {
    icon: Lightbulb,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    badgeVariant: "outline" as const,
  },
};

export function InsightsCard({ timeRange, className }: InsightsCardProps) {
  const { data, isLoading, refetch, isFetching } = useQuery<InsightsResponse>({
    queryKey: ["/api/dashboard/insights", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/insights?range=${timeRange}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">AI Insights</CardTitle>
            <CardDescription>Smart recommendations based on your performance</CardDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Analyzing your performance...</span>
            </div>
          </div>
        ) : !data?.insights || data.insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No insights available yet</p>
            <p className="text-xs mt-1">Make some calls to get personalized recommendations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.insights.map((insight) => {
              const config = typeConfig[insight.type];
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={cn(
                    "p-3 rounded-lg transition-colors",
                    config.bgColor
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5", config.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{insight.title}</span>
                        {insight.priority >= 4 && (
                          <Badge variant={config.badgeVariant} className="text-xs px-1.5 py-0">
                            Important
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.message}</p>
                      {insight.action && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                          <ChevronRight className="h-3 w-3" />
                          <span>{insight.action}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {data.generatedAt && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Generated {new Date(data.generatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
