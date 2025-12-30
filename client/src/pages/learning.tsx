import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  BookOpen,
  Lightbulb,
  TrendingUp,
  Target,
  MessageSquare,
  Phone,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Trophy,
  Award,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CoachingTip {
  id: string;
  type: string;
  tip: string;
  sessionId: string;
  createdAt: string;
}

interface CallAnalysis {
  id: string;
  sessionId: string;
  overallScore: number;
  openingScore: number;
  discoveryScore: number;
  valuePropositionScore: number;
  objectionHandlingScore: number;
  closingScore: number;
  toneScore: number;
  complianceScore: number;
  strengths: string[];
  improvements: string[];
  keyMoments: string[];
  createdAt: string;
  session?: {
    toNumber: string;
    duration: number;
    startedAt: string;
  };
}

interface LearningData {
  recentTips: CoachingTip[];
  recentAnalyses: CallAnalysis[];
  performanceStats: {
    totalCalls: number;
    analyzedCalls: number;
    averageScore: number;
    scoresByDimension: {
      opening: number;
      discovery: number;
      valueProposition: number;
      objectionHandling: number;
      closing: number;
      tone: number;
      compliance: number;
    };
  };
  topStrengths: string[];
  areasForImprovement: string[];
}

function ScoreIndicator({ score, label }: { score: number; label: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 8) return "text-green-600 dark:text-green-400";
    if (s >= 6) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (s: number) => {
    if (s >= 8) return "bg-green-500";
    if (s >= 6) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
          {score.toFixed(1)}/10
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getProgressColor(score)} transition-all`}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}

function TipCard({ tip }: { tip: CoachingTip }) {
  const typeIcons: Record<string, typeof Lightbulb> = {
    opening: Phone,
    discovery: MessageSquare,
    objection: Target,
    closing: CheckCircle,
    general: Lightbulb,
  };

  const Icon = typeIcons[tip.type.toLowerCase()] || Lightbulb;

  return (
    <div className="p-4 bg-muted/50 rounded-md space-y-2" data-testid={`tip-card-${tip.id}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-md shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs capitalize">
              {tip.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(tip.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm">{tip.tip}</p>
        </div>
      </div>
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: CallAnalysis }) {
  const getScoreBadge = (score: number) => {
    if (score >= 8) return { variant: "default" as const, label: "Excellent" };
    if (score >= 6) return { variant: "secondary" as const, label: "Good" };
    return { variant: "outline" as const, label: "Needs Work" };
  };

  const badge = getScoreBadge(analysis.overallScore);

  return (
    <div className="p-4 bg-muted/50 rounded-md space-y-3" data-testid={`analysis-card-${analysis.id}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Call to {analysis.session?.toNumber || "Unknown"}
            </p>
            <p className="text-xs text-muted-foreground">
              {analysis.session?.duration ? `${Math.floor(analysis.session.duration / 60)}m ${analysis.session.duration % 60}s` : "Unknown duration"}
              {" · "}
              {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{analysis.overallScore.toFixed(1)}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </div>

      {analysis.strengths.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Strengths</p>
          <ul className="text-xs space-y-0.5">
            {analysis.strengths.slice(0, 2).map((s, i) => (
              <li key={i} className="flex items-start gap-1">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.improvements.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Areas to Improve</p>
          <ul className="text-xs space-y-0.5">
            {analysis.improvements.slice(0, 2).map((s, i) => (
              <li key={i} className="flex items-start gap-1">
                <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function LearningPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: learningData, isLoading } = useQuery<LearningData>({
    queryKey: ["/api/learning/insights"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = learningData?.performanceStats;
  const avgScore = stats?.averageScore || 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-learning-title">
          <BookOpen className="h-6 w-6" />
          Learning Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Personalized coaching insights to improve your sales performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calls Made</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-total-calls">
              {stats?.totalCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total calls tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calls Analyzed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-analyzed-calls">
              {stats?.analyzedCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">AI reviewed calls</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-avg-score">
              {avgScore.toFixed(1)}/10
            </div>
            <Progress value={avgScore * 10} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tips Received</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-tips-count">
              {learningData?.recentTips?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Coaching insights</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tips" data-testid="tab-tips">
            <Lightbulb className="h-4 w-4 mr-2" />
            Coaching Tips
          </TabsTrigger>
          <TabsTrigger value="analyses" data-testid="tab-analyses">
            <Target className="h-4 w-4 mr-2" />
            Call Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Skills Breakdown
                </CardTitle>
                <CardDescription>Performance across key dimensions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.scoresByDimension ? (
                  <>
                    <ScoreIndicator score={stats.scoresByDimension.opening} label="Opening & Rapport" />
                    <ScoreIndicator score={stats.scoresByDimension.discovery} label="Discovery Questions" />
                    <ScoreIndicator score={stats.scoresByDimension.valueProposition} label="Value Proposition" />
                    <ScoreIndicator score={stats.scoresByDimension.objectionHandling} label="Objection Handling" />
                    <ScoreIndicator score={stats.scoresByDimension.closing} label="Closing Techniques" />
                    <ScoreIndicator score={stats.scoresByDimension.tone} label="Tone & Confidence" />
                    <ScoreIndicator score={stats.scoresByDimension.compliance} label="Compliance" />
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No call analyses yet</p>
                    <p className="text-xs">Complete calls to see your skills breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-green-500" />
                    Top Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {learningData?.topStrengths && learningData.topStrengths.length > 0 ? (
                    <ul className="space-y-2">
                      {learningData.topStrengths.slice(0, 5).map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Complete calls to discover your strengths
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Focus Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {learningData?.areasForImprovement && learningData.areasForImprovement.length > 0 ? (
                    <ul className="space-y-2">
                      {learningData.areasForImprovement.slice(0, 5).map((area, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                          <span>{area}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Complete calls to identify improvement areas
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tips" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Recent Coaching Tips
              </CardTitle>
              <CardDescription>AI-generated insights from your calls</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {learningData?.recentTips && learningData.recentTips.length > 0 ? (
                  <div className="space-y-3">
                    {learningData.recentTips.map((tip) => (
                      <TipCard key={tip.id} tip={tip} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No coaching tips yet</p>
                    <p className="text-sm mt-1">
                      Make calls to receive personalized coaching insights
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Call Reviews
              </CardTitle>
              <CardDescription>Detailed analysis of your recent calls</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {learningData?.recentAnalyses && learningData.recentAnalyses.length > 0 ? (
                  <div className="space-y-3">
                    {learningData.recentAnalyses.map((analysis) => (
                      <AnalysisCard key={analysis.id} analysis={analysis} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No call reviews yet</p>
                    <p className="text-sm mt-1">
                      Your call analyses will appear here after review
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
