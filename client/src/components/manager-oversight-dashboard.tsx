import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { 
  Phone, 
  Clock, 
  Target, 
  TrendingUp,
  Users,
  CalendarCheck,
  MessageSquare,
  Play,
  ChevronRight,
  Loader2,
  BarChart3,
  FileSearch,
  ArrowUpRight,
  Zap
} from "lucide-react";
import type { CallSession } from "@shared/schema";

interface SdrPerformance {
  sdrId: string;
  sdrName: string;
  userId: string | null;
  totalCalls: number;
  completedCalls: number;
  totalTalkTimeMinutes: number;
  avgCallDuration: number;
  qualifiedLeads: number;
  connectRate: number;
  meetingsBooked: number;
}

interface ToolUsageAccountability {
  callsWithPrep: number;
  callsWithoutPrep: number;
  meetingsWithPrep: number;
  meetingsWithoutPrep: number;
  connectRateWithPrep: number;
  connectRateWithoutPrep: number;
  meetingRateWithPrep: number;
  meetingRateWithoutPrep: number;
  connectRateImprovement: number;
  meetingRateImprovement: number;
}

interface ManagerOversightData {
  weeklyStats: {
    totalCalls: number;
    completedCalls: number;
    totalTalkTimeMinutes: number;
    meetingsBooked: number;
    qualifiedLeads: number;
  };
  monthlyStats: {
    totalCalls: number;
    completedCalls: number;
    totalTalkTimeMinutes: number;
    meetingsBooked: number;
    qualifiedLeads: number;
  };
  sdrPerformance: SdrPerformance[];
  dispositionBreakdown: Record<string, number>;
  toolUsageAccountability: ToolUsageAccountability;
  recentCalls: CallSession[];
}

interface ManagerOversightDashboardProps {
  onCallReview?: (callId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDisposition(disposition: string): string {
  const map: Record<string, string> = {
    "connected": "Connected",
    "voicemail": "Voicemail",
    "no-answer": "No Answer",
    "busy": "Busy",
    "callback-scheduled": "Callback",
    "not-interested": "Not Interested",
    "qualified": "Qualified",
    "meeting-booked": "Meeting Booked",
    "unknown": "Unknown",
  };
  return map[disposition] || disposition;
}

function getDispositionColor(disposition: string): string {
  const colors: Record<string, string> = {
    "connected": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "qualified": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "meeting-booked": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    "voicemail": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    "callback-scheduled": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    "not-interested": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "no-answer": "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
    "busy": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return colors[disposition] || "bg-muted text-muted-foreground";
}

export function ManagerOversightDashboard({ onCallReview }: ManagerOversightDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">("week");

  const { data: oversight, isLoading } = useQuery<ManagerOversightData>({
    queryKey: ["/api/manager/oversight"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = selectedPeriod === "week" ? oversight?.weeklyStats : oversight?.monthlyStats;
  const periodLabel = selectedPeriod === "week" ? "This Week" : "This Month";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-oversight-title">Team Oversight</h2>
          <p className="text-sm text-muted-foreground">
            Monitor SDR performance and review calls
          </p>
        </div>
        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as "week" | "month")}>
          <TabsList>
            <TabsTrigger value="week" data-testid="tab-weekly">Weekly</TabsTrigger>
            <TabsTrigger value="month" data-testid="tab-monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-team-total-calls">
              {stats?.totalCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-team-completed">
              {stats?.completedCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalCalls ? Math.round((stats.completedCalls / stats.totalCalls) * 100) : 0}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Talk Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-team-talk-time">
              {stats?.totalTalkTimeMinutes || 0}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-team-qualified">
              {stats?.qualifiedLeads || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Qualified leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Meetings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="metric-team-meetings">
              {stats?.meetingsBooked || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Booked</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              SDR Performance
            </CardTitle>
            <CardDescription>Weekly metrics by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              {oversight?.sdrPerformance && oversight.sdrPerformance.length > 0 ? (
                <div className="space-y-4">
                  {oversight.sdrPerformance
                    .sort((a, b) => b.totalCalls - a.totalCalls)
                    .map((sdr) => (
                      <div 
                        key={sdr.sdrId}
                        className="p-3 bg-muted/50 rounded-md space-y-2"
                        data-testid={`sdr-performance-${sdr.sdrId}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(sdr.sdrName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{sdr.sdrName}</p>
                              <p className="text-xs text-muted-foreground">
                                {sdr.totalCalls} calls this week
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {sdr.meetingsBooked > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {sdr.meetingsBooked} meetings
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Talk time:</span>{" "}
                            <span className="font-medium">{sdr.totalTalkTimeMinutes}m</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Connect:</span>{" "}
                            <span className="font-medium">{sdr.connectRate}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Qualified:</span>{" "}
                            <span className="font-medium">{sdr.qualifiedLeads}</span>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(sdr.connectRate, 100)} 
                          className="h-1"
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No SDR performance data available</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Disposition Breakdown
            </CardTitle>
            <CardDescription>Call outcomes this week</CardDescription>
          </CardHeader>
          <CardContent>
            {oversight?.dispositionBreakdown && Object.keys(oversight.dispositionBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(oversight.dispositionBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([disposition, count]) => {
                    const total = Object.values(oversight.dispositionBreakdown).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={disposition} className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <Badge className={getDispositionColor(disposition)}>
                            {formatDisposition(disposition)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No disposition data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tool Usage Accountability - Shows ROI of using Lead Intel */}
      {oversight?.toolUsageAccountability && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Tool Usage Accountability
            </CardTitle>
            <CardDescription>
              Correlation between Lead Intel usage and call outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border-2 border-green-500">
                <div className="flex items-center gap-2 mb-2">
                  <FileSearch className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                    With Intel
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      {oversight.toolUsageAccountability.connectRateWithPrep}%
                    </p>
                    <p className="text-xs text-muted-foreground">connect rate</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {oversight.toolUsageAccountability.callsWithPrep} calls | {oversight.toolUsageAccountability.meetingsWithPrep} meetings
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Without Intel
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                      {oversight.toolUsageAccountability.connectRateWithoutPrep}%
                    </p>
                    <p className="text-xs text-muted-foreground">connect rate</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {oversight.toolUsageAccountability.callsWithoutPrep} calls | {oversight.toolUsageAccountability.meetingsWithoutPrep} meetings
                  </div>
                </div>
              </div>

              {oversight.toolUsageAccountability.connectRateImprovement > 0 && (
                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border-2 border-green-300 dark:border-green-700 col-span-1 md:col-span-2 lg:col-span-2 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <ArrowUpRight className="h-6 w-6 text-green-600" />
                      <span className="text-4xl font-bold text-green-600">
                        {oversight.toolUsageAccountability.connectRateImprovement}%
                      </span>
                    </div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Higher connect rate when using Lead Intel
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      SDRs who use the research tool before calls are more effective
                    </p>
                  </div>
                </div>
              )}
            </div>

            {oversight.toolUsageAccountability.callsWithPrep === 0 && oversight.toolUsageAccountability.callsWithoutPrep === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <FileSearch className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="font-medium">No call data yet this week</p>
                <p className="text-sm">Tool usage metrics will appear as calls are made</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Calls for Review
          </CardTitle>
          <CardDescription>Click to review recordings, transcripts, and add coaching notes</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {oversight?.recentCalls && oversight.recentCalls.length > 0 ? (
              <div className="space-y-2">
                {oversight.recentCalls.slice(0, 20).map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md hover-elevate cursor-pointer"
                    onClick={() => onCallReview?.(call.id)}
                    data-testid={`review-call-${call.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${
                        call.status === "completed" 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-muted"
                      }`}>
                        <Phone className={`h-4 w-4 ${
                          call.status === "completed"
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {call.toNumber || call.fromNumber || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {call.startedAt ? new Date(call.startedAt).toLocaleString() : "Unknown time"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {call.duration && (
                        <span className="text-sm text-muted-foreground">
                          {Math.round(call.duration / 60)}m
                        </span>
                      )}
                      {call.disposition && (
                        <Badge className={getDispositionColor(call.disposition)}>
                          {formatDisposition(call.disposition)}
                        </Badge>
                      )}
                      {call.recordingUrl && (
                        <Play className="h-4 w-4 text-muted-foreground" />
                      )}
                      {call.managerSummary && (
                        <Badge variant="outline" className="text-xs">Reviewed</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent calls to review</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
