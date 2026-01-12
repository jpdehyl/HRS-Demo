import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Building,
  Globe,
  Calendar
} from "lucide-react";

interface ComparativeAnalyticsData {
  sdrRankings: {
    sdrId: string;
    name: string;
    rank: number;
    callVolume: number;
    conversionRate: number;
    avgScore: number;
    trend: "up" | "down" | "stable";
  }[];
  industryPerformance: {
    industry: string;
    leadCount: number;
    conversionRate: number;
    avgFitScore: number;
    trend: "up" | "down" | "stable";
  }[];
  sourceEffectiveness: {
    source: string;
    leadCount: number;
    qualificationRate: number;
    avgTimeToQualify: number;
  }[];
  weekOverWeek: {
    metric: string;
    thisWeek: number;
    lastWeek: number;
    change: number;
    aiCommentary: string;
  }[];
}

interface ComparativeAnalyticsProps {
  data?: ComparativeAnalyticsData;
  isLoading?: boolean;
}

export function ComparativeAnalytics({ data, isLoading }: ComparativeAnalyticsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Comparative Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle>Comparative Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No comparative data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (rank === 2) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    if (rank === 3) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle>Comparative Analytics</CardTitle>
        </div>
        <CardDescription>Benchmarking and performance comparisons</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rankings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rankings" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="industry" className="text-xs">
              <Building className="h-3 w-3 mr-1" />
              Industry
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              Sources
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Trends
            </TabsTrigger>
          </TabsList>

          {/* SDR Rankings */}
          <TabsContent value="rankings" className="space-y-3">
            {data.sdrRankings.map((sdr) => (
              <div
                key={sdr.sdrId}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <Badge className={`${getRankBadge(sdr.rank)} w-8 justify-center`}>
                  #{sdr.rank}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{sdr.name}</span>
                    {getTrendIcon(sdr.trend)}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>{sdr.callVolume} calls</span>
                    <span>{sdr.conversionRate.toFixed(1)}% convert</span>
                    <span>Score: {sdr.avgScore.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.sdrRankings.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No SDR data available
              </p>
            )}
          </TabsContent>

          {/* Industry Performance */}
          <TabsContent value="industry" className="space-y-3">
            {data.industryPerformance.map((industry, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getTrendIcon(industry.trend)}
                  <div>
                    <span className="font-medium">{industry.industry}</span>
                    <p className="text-xs text-muted-foreground">
                      {industry.leadCount} leads
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{industry.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    Fit: {industry.avgFitScore.toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
            {data.industryPerformance.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No industry data available
              </p>
            )}
          </TabsContent>

          {/* Source Effectiveness */}
          <TabsContent value="sources" className="space-y-3">
            {data.sourceEffectiveness.map((source, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div>
                  <span className="font-medium capitalize">{source.source}</span>
                  <p className="text-xs text-muted-foreground">
                    {source.leadCount} leads
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{source.qualificationRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    ~{source.avgTimeToQualify}d to qualify
                  </p>
                </div>
              </div>
            ))}
            {data.sourceEffectiveness.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No source data available
              </p>
            )}
          </TabsContent>

          {/* Week over Week Trends */}
          <TabsContent value="trends" className="space-y-3">
            {data.weekOverWeek.map((metric, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{metric.metric}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{metric.lastWeek}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{metric.thisWeek}</span>
                    <Badge
                      className={`text-xs ${
                        metric.change >= 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {metric.change >= 0 ? "+" : ""}
                      {metric.change.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{metric.aiCommentary}</p>
              </div>
            ))}
            {data.weekOverWeek.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No trend data available
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
