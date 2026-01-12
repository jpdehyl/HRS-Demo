import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertCircle
} from "lucide-react";

interface CoachingIntelligenceData {
  sdrId: string;
  sdrName: string;
  skillHeatmap: {
    dimension: string;
    currentScore: number;
    trend: "improving" | "stable" | "declining";
    percentileRank: number;
  }[];
  patterns: {
    observation: string;
    frequency: string;
    impact: "positive" | "negative" | "neutral";
  }[];
  developmentPlan: {
    priority: number;
    skill: string;
    currentLevel: string;
    targetLevel: string;
    suggestedActions: string[];
  }[];
  progressSummary: string;
}

interface CoachingIntelligenceProps {
  data?: CoachingIntelligenceData | CoachingIntelligenceData[];
  isLoading?: boolean;
  compact?: boolean;
}

export function CoachingIntelligence({ data, isLoading, compact = false }: CoachingIntelligenceProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle>Coaching Intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle array of SDRs (team view)
  if (Array.isArray(data)) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle>Team Coaching Intelligence</CardTitle>
          </div>
          <CardDescription>Skills and development areas for your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.slice(0, 5).map((sdr) => (
              <SingleSdrCoaching key={sdr.sdrId} data={sdr} compact />
            ))}
            {data.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No coaching data available yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle single SDR
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle>Coaching Intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            No coaching data available. Complete more calls to generate insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <SingleSdrCoaching data={data} compact={compact} />;
}

function SingleSdrCoaching({ data, compact }: { data: CoachingIntelligenceData; compact?: boolean }) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getImpactBadge = (impact: string) => {
    const colors: Record<string, string> = {
      positive: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    };
    return colors[impact] || colors.neutral;
  };

  if (compact) {
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{data.sdrName}</h4>
          <div className="flex gap-1">
            {data.skillHeatmap.slice(0, 3).map((skill) => (
              <div
                key={skill.dimension}
                className="flex items-center gap-1 text-xs"
                title={skill.dimension}
              >
                <span className={getScoreColor(skill.currentScore)}>
                  {skill.currentScore.toFixed(0)}
                </span>
                {getTrendIcon(skill.trend)}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {data.progressSummary}
        </p>
        {data.developmentPlan.length > 0 && (
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary">
              Focus: {data.developmentPlan[0].skill}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle>{data.sdrName}</CardTitle>
          </div>
        </div>
        <CardDescription>Individual coaching insights and development plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skill Heatmap */}
        <div>
          <h4 className="text-sm font-medium mb-3">Skills Assessment</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.skillHeatmap.map((skill) => (
              <div
                key={skill.dimension}
                className="bg-muted/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{skill.dimension}</span>
                  {getTrendIcon(skill.trend)}
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(skill.currentScore)}`}>
                  {skill.currentScore.toFixed(0)}
                </div>
                <Progress value={skill.currentScore} className="h-1" />
                <p className="text-xs text-muted-foreground">
                  Top {100 - skill.percentileRank}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Patterns */}
        {data.patterns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Behavioral Patterns</h4>
            <div className="space-y-2">
              {data.patterns.map((pattern, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">{pattern.observation}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {pattern.frequency}
                      </Badge>
                      <Badge className={`text-xs ${getImpactBadge(pattern.impact)}`}>
                        {pattern.impact}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Development Plan */}
        {data.developmentPlan.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Development Plan</h4>
            <div className="space-y-3">
              {data.developmentPlan.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Priority {item.priority}
                    </Badge>
                    <span className="font-medium">{item.skill}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{item.currentLevel}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary font-medium">{item.targetLevel}</span>
                  </div>
                  <ul className="space-y-1 mt-2">
                    {item.suggestedActions.map((action, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Summary */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Progress Summary</h4>
          <p className="text-sm text-muted-foreground">{data.progressSummary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
