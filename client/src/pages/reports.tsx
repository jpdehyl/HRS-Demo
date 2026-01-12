import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ManagerOversightDashboard } from "@/components/manager-oversight-dashboard";
import { CallReviewDialog } from "@/components/call-review-dialog";
import { CoachingEffectiveness } from "@/components/coaching-effectiveness";
import {
  ExecutiveSummary,
  PredictiveAnalytics,
  ConversationalBI,
  AnomalyAlerts,
  CoachingIntelligence,
  ResearchROI,
  ComparativeAnalytics
} from "@/components/ai-reports";
import {
  Calendar,
  Phone,
  Target,
  Clock,
  Loader2,
  RefreshCw,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Eye,
  Lightbulb,
  Sparkles,
  Brain
} from "lucide-react";
import type { CallSession, Sdr } from "@shared/schema";

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<"7" | "30">("7");
  const [selectedSdr, setSelectedSdr] = useState<string>("all");
  const [mainTab, setMainTab] = useState<string>("ai-insights");
  const [reviewCallId, setReviewCallId] = useState<string | null>(null);

  const isManager = user?.role === "admin" || user?.role === "manager";
  const periodDays = parseInt(selectedPeriod);

  // Fetch AI Reports Dashboard Data
  const { data: aiDashboard, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ["/api/ai-reports/dashboard", periodDays],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/ai-reports/dashboard?period=${periodDays}`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch Quick Questions
  const { data: quickQuestions = [] } = useQuery<string[]>({
    queryKey: ["/api/ai-reports/quick-questions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ai-reports/quick-questions");
      return res.json();
    },
  });

  // Fetch Research ROI (separate call as it's not in dashboard)
  const { data: researchROI, isLoading: roiLoading } = useQuery({
    queryKey: ["/api/ai-reports/research-roi"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ai-reports/research-roi");
      return res.json();
    },
  });

  // Legacy data for backward compatibility
  const { data: callSessions = [] } = useQuery<CallSession[]>({
    queryKey: ["/api/call-sessions"],
  });

  const { data: sdrs = [] } = useQuery<Sdr[]>({
    queryKey: ["/api/sdrs"],
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai-reports/refresh");
      return res.json();
    },
    onSuccess: () => {
      refetchAI();
      toast({ title: "Data Refreshed", description: "AI insights have been regenerated." });
    },
    onError: () => {
      toast({ title: "Refresh Failed", description: "Could not refresh data.", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Brain className="h-6 w-6 text-primary" />
            AI Reports Hub
          </h1>
          <p className="text-muted-foreground">
            AI-powered insights, predictions, and analytics for your sales team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as "7" | "30")}>
            <SelectTrigger className="w-[140px]" data-testid="select-period">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Last 7 Days
                </div>
              </SelectItem>
              <SelectItem value="30">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  Last 30 Days
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isManager ? (
        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="ai-insights" data-testid="tab-ai-insights">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="classic" data-testid="tab-classic">
              <BarChart3 className="h-4 w-4 mr-2" />
              Classic Reports
            </TabsTrigger>
            <TabsTrigger value="team-oversight" data-testid="tab-team-oversight">
              <Eye className="h-4 w-4 mr-2" />
              Team Oversight
            </TabsTrigger>
            <TabsTrigger value="coaching-effectiveness" data-testid="tab-coaching-effectiveness">
              <Lightbulb className="h-4 w-4 mr-2" />
              Coaching
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-insights" className="space-y-6">
            {/* Anomaly Alerts Bar */}
            <AnomalyAlerts
              anomalies={aiDashboard?.anomalies}
              isLoading={aiLoading}
            />

            {/* Executive Summary */}
            <ExecutiveSummary
              data={aiDashboard?.summary}
              isLoading={aiLoading}
            />

            {/* Predictive Analytics */}
            <PredictiveAnalytics
              data={aiDashboard?.predictions}
              isLoading={aiLoading}
            />

            {/* Conversational BI */}
            <ConversationalBI
              quickQuestions={quickQuestions}
              period={periodDays}
            />

            {/* Three Column Layout for Deep Dives */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <CoachingIntelligence
                data={aiDashboard?.coachingIntelligence}
                isLoading={aiLoading}
                compact
              />
              <ResearchROI
                data={researchROI}
                isLoading={roiLoading}
              />
              <ComparativeAnalytics
                data={aiDashboard?.comparative}
                isLoading={aiLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="classic" className="space-y-6">
            <ReportsContent
              selectedPeriod={selectedPeriod === "7" ? "week" : "month"}
              setSelectedPeriod={(p) => setSelectedPeriod(p === "week" ? "7" : "30")}
              selectedSdr={selectedSdr}
              setSelectedSdr={setSelectedSdr}
              callSessions={callSessions}
              sdrs={sdrs}
            />
          </TabsContent>

          <TabsContent value="team-oversight" className="space-y-6">
            <ManagerOversightDashboard onCallReview={(callId) => setReviewCallId(callId)} />
          </TabsContent>

          <TabsContent value="coaching-effectiveness" className="space-y-6">
            <CoachingEffectiveness />
          </TabsContent>
        </Tabs>
      ) : (
        // Non-manager view - AI insights with limited options
        <div className="space-y-6">
          {/* Anomaly Alerts Bar */}
          <AnomalyAlerts
            anomalies={aiDashboard?.anomalies}
            isLoading={aiLoading}
          />

          {/* Executive Summary */}
          <ExecutiveSummary
            data={aiDashboard?.summary}
            isLoading={aiLoading}
          />

          {/* Predictive Analytics */}
          <PredictiveAnalytics
            data={aiDashboard?.predictions}
            isLoading={aiLoading}
          />

          {/* Conversational BI */}
          <ConversationalBI
            quickQuestions={quickQuestions}
            period={periodDays}
          />

          {/* Classic metrics for SDRs */}
          <Card>
            <CardHeader>
              <CardTitle>Your Performance</CardTitle>
              <CardDescription>Personal call metrics for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsContent
                selectedPeriod={selectedPeriod === "7" ? "week" : "month"}
                setSelectedPeriod={(p) => setSelectedPeriod(p === "week" ? "7" : "30")}
                selectedSdr={selectedSdr}
                setSelectedSdr={setSelectedSdr}
                callSessions={callSessions}
                sdrs={sdrs}
                compact
              />
            </CardContent>
          </Card>
        </div>
      )}

      <CallReviewDialog
        callId={reviewCallId}
        open={!!reviewCallId}
        onOpenChange={(open) => !open && setReviewCallId(null)}
      />
    </div>
  );
}

interface ReportsContentProps {
  selectedPeriod: "week" | "month";
  setSelectedPeriod: (period: "week" | "month") => void;
  selectedSdr: string;
  setSelectedSdr: (sdr: string) => void;
  callSessions: CallSession[];
  sdrs: Sdr[];
  compact?: boolean;
}

function ReportsContent({
  selectedPeriod,
  setSelectedPeriod,
  selectedSdr,
  setSelectedSdr,
  callSessions,
  sdrs,
  compact = false,
}: ReportsContentProps) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodStart = selectedPeriod === "week" ? weekAgo : monthAgo;

  const filteredSessions = callSessions.filter((session) => {
    const sessionDate = session.startedAt ? new Date(session.startedAt) : null;
    if (!sessionDate) return false;
    const inPeriod = sessionDate >= periodStart;
    const matchesSdr = selectedSdr === "all" || session.userId === selectedSdr;
    return inPeriod && matchesSdr;
  });

  const completedCalls = filteredSessions.filter(s => s.status === "completed");
  const totalTalkTimeMinutes = completedCalls.reduce((sum, s) => {
    if (s.duration) return sum + s.duration / 60;
    return sum;
  }, 0);
  const avgCallDuration = completedCalls.length > 0 ? totalTalkTimeMinutes / completedCalls.length : 0;

  const callsByDate = filteredSessions.reduce((acc, session) => {
    const date = session.startedAt ? new Date(session.startedAt).toLocaleDateString() : "Unknown";
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxCalls = Math.max(...Object.values(callsByDate), 1);

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{filteredSessions.length}</p>
          <p className="text-xs text-muted-foreground">Total Calls</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{completedCalls.length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{Math.round(totalTalkTimeMinutes)}m</p>
          <p className="text-xs text-muted-foreground">Talk Time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{avgCallDuration.toFixed(1)}m</p>
          <p className="text-xs text-muted-foreground">Avg Duration</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedSdr} onValueChange={setSelectedSdr}>
          <SelectTrigger className="w-[160px]" data-testid="select-sdr">
            <SelectValue placeholder="All SDRs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All SDRs</SelectItem>
            {sdrs.map((sdr) => (
              <SelectItem key={sdr.id} value={sdr.id}>{sdr.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="metric-total-calls">
              {filteredSessions.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPeriod === "week" ? "This week" : "This month"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Calls</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="metric-completed-calls">
              {completedCalls.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredSessions.length > 0
                ? `${Math.round((completedCalls.length / filteredSessions.length) * 100)}% completion rate`
                : "No calls yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Talk Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="metric-talk-time">
              {Math.round(totalTalkTimeMinutes)}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all completed calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Call Duration</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold" data-testid="metric-avg-duration">
              {avgCallDuration.toFixed(1)}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per completed call
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity" data-testid="tab-activity">
            <Calendar className="h-4 w-4 mr-2" />
            Activity Overview
          </TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">
            <Phone className="h-4 w-4 mr-2" />
            Call Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Activity by Day</CardTitle>
              <CardDescription>
                Number of calls made each day during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(callsByDate).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(callsByDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .slice(0, 14)
                    .map(([date, count]) => (
                      <div key={date} className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground w-24 flex-shrink-0">{date}</span>
                        <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(count / maxCalls) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No call data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>
                All calls made during the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {filteredSessions.length > 0 ? (
                  <div className="space-y-2">
                    {filteredSessions
                      .sort((a, b) => {
                        const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
                        const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
                        return dateB - dateA;
                      })
                      .map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md"
                          data-testid={`call-row-${session.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${
                              session.status === "completed"
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-muted"
                            }`}>
                              <Phone className={`h-4 w-4 ${
                                session.status === "completed"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-muted-foreground"
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {session.toNumber || session.fromNumber || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {session.startedAt ? new Date(session.startedAt).toLocaleString() : "Unknown time"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.duration && (
                              <span className="text-sm text-muted-foreground">
                                {Math.round(session.duration / 60)}m
                              </span>
                            )}
                            <Badge variant={session.status === "completed" ? "secondary" : "outline"}>
                              {session.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No calls found for this period</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
