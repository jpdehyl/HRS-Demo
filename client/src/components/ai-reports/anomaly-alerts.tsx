import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ChevronRight,
  Bell
} from "lucide-react";

interface Anomaly {
  id: string;
  type: "warning" | "alert" | "info";
  category: "performance" | "pipeline" | "engagement" | "coaching";
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  suggestedAction: string;
  entityId?: string;
  entityType?: string;
  detectedAt: string;
}

interface AnomalyAlertsProps {
  anomalies?: Anomaly[];
  isLoading?: boolean;
  onActionClick?: (anomaly: Anomaly) => void;
}

export function AnomalyAlerts({ anomalies = [], isLoading, onActionClick }: AnomalyAlertsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const visibleAnomalies = anomalies.filter((a) => !dismissedIds.has(a.id));

  if (isLoading) {
    return (
      <div className="animate-pulse h-12 bg-muted rounded-lg flex items-center px-4">
        <div className="h-4 w-4 bg-muted-foreground/20 rounded mr-2" />
        <div className="h-4 w-48 bg-muted-foreground/20 rounded" />
      </div>
    );
  }

  if (visibleAnomalies.length === 0) {
    return null;
  }

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "alert":
        return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900 text-red-700 dark:text-red-400";
      case "warning":
        return "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 text-amber-700 dark:text-amber-400";
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900 text-blue-700 dark:text-blue-400";
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      performance: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      pipeline: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      engagement: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      coaching: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    };
    return colors[category] || colors.performance;
  };

  // Show compact view if more than 2 alerts
  const showCompact = visibleAnomalies.length > 2;

  if (showCompact && expanded === null) {
    return (
      <Card className={`border ${getTypeStyles(visibleAnomalies[0].type)}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {visibleAnomalies.length} Alerts Detected
                </span>
              </div>
              <div className="flex gap-1">
                {visibleAnomalies.slice(0, 3).map((anomaly) => (
                  <Badge
                    key={anomaly.id}
                    variant="outline"
                    className={`text-xs ${getCategoryBadge(anomaly.category)}`}
                  >
                    {anomaly.category}
                  </Badge>
                ))}
                {visibleAnomalies.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{visibleAnomalies.length - 3}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded("all")}
              className="text-xs"
            >
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {showCompact && expanded === "all" && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(null)}
            className="text-xs"
          >
            Collapse
          </Button>
        </div>
      )}

      {visibleAnomalies.map((anomaly) => (
        <Card
          key={anomaly.id}
          className={`border ${getTypeStyles(anomaly.type)} transition-all hover:shadow-sm cursor-pointer`}
          onClick={() => setExpanded(expanded === anomaly.id ? null : anomaly.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">{getTypeIcon(anomaly.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{anomaly.title}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getCategoryBadge(anomaly.category)}`}
                    >
                      {anomaly.category}
                    </Badge>
                  </div>

                  {expanded === anomaly.id ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm opacity-90">{anomaly.description}</p>

                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className="opacity-70">Current: </span>
                          <span className="font-medium">
                            {typeof anomaly.currentValue === "number"
                              ? anomaly.currentValue.toFixed(1)
                              : anomaly.currentValue}
                          </span>
                        </div>
                        <div>
                          <span className="opacity-70">Expected: </span>
                          <span className="font-medium">
                            {typeof anomaly.expectedValue === "number"
                              ? anomaly.expectedValue.toFixed(1)
                              : anomaly.expectedValue}
                          </span>
                        </div>
                        <div>
                          <span className="opacity-70">Deviation: </span>
                          <span className="font-medium">
                            {anomaly.deviation > 0 ? "+" : ""}
                            {anomaly.deviation.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-current/10">
                        <p className="text-xs opacity-70 mb-1">Suggested Action:</p>
                        <p className="text-sm">{anomaly.suggestedAction}</p>
                      </div>

                      {onActionClick && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionClick(anomaly);
                          }}
                        >
                          Take Action
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm opacity-80 truncate">{anomaly.description}</p>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => handleDismiss(anomaly.id, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
