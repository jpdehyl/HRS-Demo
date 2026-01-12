import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  TrendingUp,
  Zap,
  Target
} from "lucide-react";

interface ResearchROIData {
  overallEffectiveness: number;
  intelUsageRate: number;
  conversionByIntelType: {
    intelType: string;
    usageRate: number;
    conversionRate: number;
  }[];
  winningTalkTracks: {
    industry: string;
    talkTrack: string;
    successRate: number;
  }[];
  topPerformingPainPoints: {
    painPoint: string;
    mentionRate: number;
    conversionRate: number;
  }[];
}

interface ResearchROIProps {
  data?: ResearchROIData;
  isLoading?: boolean;
}

export function ResearchROI({ data, isLoading }: ResearchROIProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>Research ROI</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>Research ROI</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No research data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEffectivenessColor = (value: number) => {
    if (value >= 60) return "text-green-600";
    if (value >= 40) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <CardTitle>Research ROI Analysis</CardTitle>
        </div>
        <CardDescription>
          How research intelligence impacts conversion
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Overall Effectiveness</p>
            <p className={`text-3xl font-bold ${getEffectivenessColor(data.overallEffectiveness)}`}>
              {data.overallEffectiveness.toFixed(0)}%
            </p>
            <Progress value={data.overallEffectiveness} className="h-2 mt-2" />
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Intel Usage Rate</p>
            <p className={`text-3xl font-bold ${getEffectivenessColor(data.intelUsageRate)}`}>
              {data.intelUsageRate.toFixed(0)}%
            </p>
            <Progress value={data.intelUsageRate} className="h-2 mt-2" />
          </div>
        </div>

        {/* Conversion by Intel Type */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Intel Type Effectiveness
          </h4>
          <div className="space-y-3">
            {data.conversionByIntelType.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.intelType}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.usageRate}% used
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        item.conversionRate >= 50
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {item.conversionRate}% convert
                    </Badge>
                  </div>
                </div>
                <Progress value={item.conversionRate} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Pain Points */}
        {data.topPerformingPainPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Top Converting Pain Points
            </h4>
            <div className="space-y-2">
              {data.topPerformingPainPoints.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">#{index + 1}</span>
                    <span className="text-sm">{item.painPoint}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{item.conversionRate.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Winning Talk Tracks */}
        {data.winningTalkTracks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Winning Talk Tracks</h4>
            <div className="space-y-2">
              {data.winningTalkTracks.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-xs">
                      {item.industry}
                    </Badge>
                    <span className="text-sm font-medium text-green-600">
                      {item.successRate}% success
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.talkTrack}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
