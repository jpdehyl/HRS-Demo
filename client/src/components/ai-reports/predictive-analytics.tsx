import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  TrendingUp,
  Clock,
  AlertCircle,
  Users,
  Zap
} from "lucide-react";

interface PredictiveInsightsData {
  pipelineForecast: {
    expectedQualified: { min: number; max: number };
    expectedConverted: { min: number; max: number };
    confidence: string;
  };
  leadScorePredictions: {
    leadId: string;
    companyName: string;
    predictedConversion: number;
    keyFactors: string[];
  }[];
  sdrBurnoutRisk: {
    sdrId: string;
    name: string;
    riskLevel: "low" | "medium" | "high";
    indicators: string[];
  }[];
  bestTimeToCall: {
    industry: string;
    bestHours: string[];
    bestDays: string[];
  }[];
  atRiskLeads: {
    leadId: string;
    companyName: string;
    daysSinceContact: number;
    riskReason: string;
  }[];
}

interface PredictiveAnalyticsProps {
  data?: PredictiveInsightsData;
  isLoading?: boolean;
}

export function PredictiveAnalytics({ data, isLoading }: PredictiveAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const confidenceColor = {
    high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  };

  const riskColors = {
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Predictive Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pipeline Forecast */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Pipeline Forecast</CardTitle>
              </div>
              <Badge className={confidenceColor[data.pipelineForecast.confidence as keyof typeof confidenceColor] || confidenceColor.medium}>
                {data.pipelineForecast.confidence}
              </Badge>
            </div>
            <CardDescription>Expected next period outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Qualified Leads</span>
                <span className="font-semibold">
                  {data.pipelineForecast.expectedQualified.min}-{data.pipelineForecast.expectedQualified.max}
                </span>
              </div>
              <Progress
                value={(data.pipelineForecast.expectedQualified.min / 10) * 100}
                className="h-2"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Converted Leads</span>
                <span className="font-semibold">
                  {data.pipelineForecast.expectedConverted.min}-{data.pipelineForecast.expectedConverted.max}
                </span>
              </div>
              <Progress
                value={(data.pipelineForecast.expectedConverted.min / 5) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Lead Predictions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium">Top Conversion Prospects</CardTitle>
            </div>
            <CardDescription>Leads most likely to convert</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.leadScorePredictions.slice(0, 4).map((lead, index) => (
                <div key={lead.leadId || index} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.keyFactors.slice(0, 2).join(", ")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {lead.predictedConversion}%
                  </Badge>
                </div>
              ))}
              {data.leadScorePredictions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No predictions available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Leads */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm font-medium">At-Risk Leads</CardTitle>
            </div>
            <CardDescription>Leads that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.atRiskLeads.slice(0, 4).map((lead, index) => (
                <div key={lead.leadId || index} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lead.riskReason}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2 text-amber-600">
                    {lead.daysSinceContact}d
                  </Badge>
                </div>
              ))}
              {data.atRiskLeads.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No at-risk leads detected
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Best Time to Call */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium">Best Time to Call</CardTitle>
            </div>
            <CardDescription>Optimal outreach windows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.bestTimeToCall.slice(0, 3).map((timing, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium">{timing.industry}</p>
                  <div className="flex flex-wrap gap-1">
                    {timing.bestHours.map((hour, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {hour}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Best days: {timing.bestDays.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SDR Burnout Risk */}
        {data.sdrBurnoutRisk.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-sm font-medium">Team Health</CardTitle>
              </div>
              <CardDescription>SDR wellbeing indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.sdrBurnoutRisk.slice(0, 4).map((sdr, index) => (
                  <div key={sdr.sdrId || index} className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sdr.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {sdr.indicators.slice(0, 2).join(", ")}
                      </p>
                    </div>
                    <Badge className={riskColors[sdr.riskLevel]}>
                      {sdr.riskLevel}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
