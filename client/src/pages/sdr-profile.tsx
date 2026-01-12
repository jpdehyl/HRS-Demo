import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Phone,
  Target,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Award,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  PhoneCall,
  PhoneMissed,
  Mail,
  User,
  Briefcase,
  MapPin,
  Trophy,
  Flame,
  Star,
  AlertCircle,
  ChevronRight,
  Building2,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { LeadDetailModal } from "@/components/lead-detail-modal";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamAverages {
  sdrCount: number;
  avgTotalCalls: number;
  avgTotalConnected: number;
  avgTotalQualified: number;
  avgTotalMeetings: number;
  avgConnectRate: number;
  avgConversionRate: number;
  avgMeetingRate: number;
  avgWeekCalls: number;
  avgWeekConnected: number;
  avgWeekQualified: number;
  avgWeekMeetings: number;
  avgMonthCalls: number;
  avgMonthConnected: number;
  avgMonthQualified: number;
  avgMonthMeetings: number;
}

type TimePeriod = "all" | "month" | "week";

interface SdrProfile {
  sdr: {
    id: string;
    name: string;
    email: string;
    timezone: string | null;
    isActive: boolean;
    createdAt: string;
  };
  manager: { id: string; name: string; email: string } | null;
  performance: {
    totalCalls: number;
    totalConnected: number;
    totalQualified: number;
    totalMeetings: number;
    totalTalkTimeSeconds: number;
    avgCallDuration: number;
    connectRate: number;
    conversionRate: number;
    meetingRate: number;
    weekCalls: number;
    weekConnected: number;
    weekQualified: number;
    weekMeetings: number;
    monthCalls: number;
    monthConnected: number;
    monthQualified: number;
    monthMeetings: number;
    lastMonthCalls: number;
    lastMonthQualified: number;
    lastMonthMeetings: number;
  };
  trends: {
    callsTrend: number;
    qualifiedTrend: number;
    meetingsTrend: number;
  };
  dispositionBreakdown: Record<string, number>;
  weeklyActivity: Array<{ date: string; calls: number; qualified: number; meetings: number }>;
  bestHours: Array<{ hour: number; calls: number; connected: number; connectRate: number }>;
  recentCalls: Array<{
    id: string;
    leadId: string | null;
    leadName: string;
    companyName: string;
    disposition: string;
    duration: number | null;
    startedAt: string;
    keyTakeaways: string | null;
    sentimentScore: number | null;
  }>;
  leadPortfolio: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: { hot: number; warm: number; cold: number; unset: number };
    avgFitScore: number;
    needsFollowUp: number;
    recentlyContacted: number;
  };
  topLeads: Array<{
    id: string;
    companyName: string;
    contactName: string;
    status: string;
    fitScore: number | null;
    priority: string | null;
    nextFollowUpAt: string | null;
  }>;
  achievements: Array<{ title: string; description: string; date?: string; icon: string }>;
  coachingInsights: {
    avgOverallScore: number | null;
    avgOpeningScore: number | null;
    avgDiscoveryScore: number | null;
    avgListeningScore: number | null;
    avgClosingScore: number | null;
    recentFeedback: Array<{ date: string; score: number; summary: string }>;
    strengths: string[];
    areasForImprovement: string[];
  };
}

const DISPOSITION_COLORS: Record<string, string> = {
  qualified: "#22c55e",
  "meeting-booked": "#3b82f6",
  connected: "#8b5cf6",
  "callback-scheduled": "#f59e0b",
  "not-interested": "#ef4444",
  "no-answer": "#6b7280",
  voicemail: "#94a3b8",
  "wrong-number": "#dc2626",
  unknown: "#9ca3af",
};

const DISPOSITION_LABELS: Record<string, string> = {
  qualified: "Qualified",
  "meeting-booked": "Meeting Booked",
  connected: "Connected",
  "callback-scheduled": "Callback",
  "not-interested": "Not Interested",
  "no-answer": "No Answer",
  voicemail: "Voicemail",
  "wrong-number": "Wrong Number",
  unknown: "Unknown",
};

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  calendar: <Calendar className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  phone: <Phone className="h-5 w-5" />,
  trophy: <Trophy className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
};

function StatCard({
  label,
  value,
  subValue,
  trend,
  icon,
  className = "",
}: {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div
            className={`flex items-center gap-1 mt-2 text-sm ${
              trend > 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>
              {trend > 0 ? "+" : ""}
              {trend}% vs last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillBar({ label, score, color }: { label: string; score: number | null; color: string }) {
  if (score === null) return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{score}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function SdrProfilePage() {
  const { sdrId } = useParams<{ sdrId: string }>();
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");

  const { data: profile, isLoading, error } = useQuery<SdrProfile>({
    queryKey: ["/api/sdrs", sdrId, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/sdrs/${sdrId}/profile`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch SDR profile");
      return res.json();
    },
    enabled: !!sdrId,
  });

  const { data: teamAverages } = useQuery<TeamAverages>({
    queryKey: ["/api/team-averages"],
  });

  // Helper to get metrics based on time period
  const getMetricsByPeriod = (profile: SdrProfile) => {
    const p = profile.performance;
    switch (timePeriod) {
      case "week":
        return {
          calls: p.weekCalls,
          connected: p.weekConnected,
          qualified: p.weekQualified,
          meetings: p.weekMeetings,
          connectRate: p.weekCalls > 0 ? Math.round((p.weekConnected / p.weekCalls) * 100) : 0,
          conversionRate: p.weekCalls > 0 ? Math.round((p.weekQualified / p.weekCalls) * 100) : 0,
        };
      case "month":
        return {
          calls: p.monthCalls,
          connected: p.monthConnected,
          qualified: p.monthQualified,
          meetings: p.monthMeetings,
          connectRate: p.monthCalls > 0 ? Math.round((p.monthConnected / p.monthCalls) * 100) : 0,
          conversionRate: p.monthCalls > 0 ? Math.round((p.monthQualified / p.monthCalls) * 100) : 0,
        };
      default:
        return {
          calls: p.totalCalls,
          connected: p.totalConnected,
          qualified: p.totalQualified,
          meetings: p.totalMeetings,
          connectRate: p.connectRate,
          conversionRate: p.conversionRate,
        };
    }
  };

  // Helper to get team averages based on time period
  const getTeamAvgByPeriod = (teamAvg: TeamAverages) => {
    switch (timePeriod) {
      case "week":
        return {
          calls: teamAvg.avgWeekCalls,
          connected: teamAvg.avgWeekConnected,
          qualified: teamAvg.avgWeekQualified,
          meetings: teamAvg.avgWeekMeetings,
          connectRate: teamAvg.avgConnectRate,
          conversionRate: teamAvg.avgConversionRate,
        };
      case "month":
        return {
          calls: teamAvg.avgMonthCalls,
          connected: teamAvg.avgMonthConnected,
          qualified: teamAvg.avgMonthQualified,
          meetings: teamAvg.avgMonthMeetings,
          connectRate: teamAvg.avgConnectRate,
          conversionRate: teamAvg.avgConversionRate,
        };
      default:
        return {
          calls: teamAvg.avgTotalCalls,
          connected: teamAvg.avgTotalConnected,
          qualified: teamAvg.avgTotalQualified,
          meetings: teamAvg.avgTotalMeetings,
          connectRate: teamAvg.avgConnectRate,
          conversionRate: teamAvg.avgConversionRate,
        };
    }
  };

  // Helper to calculate comparison percentage
  const getComparisonBadge = (value: number, teamAvg: number) => {
    if (teamAvg === 0) return null;
    const diff = Math.round(((value - teamAvg) / teamAvg) * 100);
    if (diff === 0) return null;
    return {
      diff,
      isPositive: diff > 0,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Failed to load SDR profile</p>
        <Link href="/team">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
      </div>
    );
  }

  const pieData = Object.entries(profile.dispositionBreakdown).map(([name, value]) => ({
    name: DISPOSITION_LABELS[name] || name,
    value,
    color: DISPOSITION_COLORS[name] || "#9ca3af",
  }));

  const totalTalkTimeHours = Math.floor(profile.performance.totalTalkTimeSeconds / 3600);
  const totalTalkTimeMinutes = Math.floor(
    (profile.performance.totalTalkTimeSeconds % 3600) / 60
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/team">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{profile.sdr.name}</h1>
              <Badge variant={profile.sdr.isActive ? "default" : "secondary"}>
                {profile.sdr.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {profile.sdr.email}
              </span>
              {profile.sdr.timezone && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.sdr.timezone}
                </span>
              )}
              {profile.manager && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  Reports to {profile.manager.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time Period Selector & Achievements */}
        <div className="flex items-center gap-4">
          <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          {profile.achievements.length > 0 && (
            <div className="flex gap-2">
              {profile.achievements.slice(0, 3).map((achievement, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800"
                  title={achievement.description}
                >
                  <div className="text-amber-600">{ACHIEVEMENT_ICONS[achievement.icon]}</div>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {achievement.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics with Team Comparison */}
      {(() => {
        const metrics = getMetricsByPeriod(profile);
        const teamAvg = teamAverages ? getTeamAvgByPeriod(teamAverages) : null;

        const ComparisonBadge = ({ value, teamValue }: { value: number; teamValue: number | undefined }) => {
          if (!teamValue) return null;
          const comparison = getComparisonBadge(value, teamValue);
          if (!comparison) return null;
          return (
            <Badge
              variant="outline"
              className={`text-xs ${
                comparison.isPositive
                  ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
                  : "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30"
              }`}
            >
              {comparison.isPositive ? "+" : ""}{comparison.diff}% vs team
            </Badge>
          );
        };

        const periodLabel = timePeriod === "week" ? "this week" : timePeriod === "month" ? "this month" : "all time";

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Calls</p>
                    <p className="text-3xl font-bold mt-1">{metrics.calls}</p>
                    <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
                  </div>
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                {teamAvg && <div className="mt-2"><ComparisonBadge value={metrics.calls} teamValue={teamAvg.calls} /></div>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Connected</p>
                    <p className="text-3xl font-bold mt-1">{metrics.connected}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metrics.connectRate}% rate</p>
                  </div>
                  <PhoneCall className="h-5 w-5 text-muted-foreground" />
                </div>
                {teamAvg && <div className="mt-2"><ComparisonBadge value={metrics.connectRate} teamValue={teamAvg.connectRate} /></div>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Qualified</p>
                    <p className="text-3xl font-bold mt-1">{metrics.qualified}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metrics.conversionRate}% rate</p>
                  </div>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                {teamAvg && <div className="mt-2"><ComparisonBadge value={metrics.qualified} teamValue={teamAvg.qualified} /></div>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Meetings</p>
                    <p className="text-3xl font-bold mt-1">{metrics.meetings}</p>
                    <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
                  </div>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                {teamAvg && <div className="mt-2"><ComparisonBadge value={metrics.meetings} teamValue={teamAvg.meetings} /></div>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Connect Rate</p>
                    <p className="text-3xl font-bold mt-1">{metrics.connectRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                {teamAvg && <div className="mt-2"><ComparisonBadge value={metrics.connectRate} teamValue={teamAvg.connectRate} /></div>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Talk Time</p>
                    <p className="text-3xl font-bold mt-1">{totalTalkTimeHours}h {totalTalkTimeMinutes}m</p>
                    <p className="text-xs text-muted-foreground mt-1">total</p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Team Context */}
      {teamAverages && teamAverages.sdrCount > 1 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Comparing against {teamAverages.sdrCount} team members</span>
        </div>
      )}

      {/* This Week Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              This Week
            </CardTitle>
            <Badge variant="outline">
              {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} - Now
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">{profile.performance.weekCalls}</p>
              <p className="text-sm text-muted-foreground">Calls</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">{profile.performance.weekConnected}</p>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{profile.performance.weekQualified}</p>
              <p className="text-sm text-muted-foreground">Qualified</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">{profile.performance.weekMeetings}</p>
              <p className="text-sm text-muted-foreground">Meetings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="leads">Lead Portfolio</TabsTrigger>
          <TabsTrigger value="calls">Call History</TabsTrigger>
          <TabsTrigger value="coaching">Coaching</TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Weekly Activity Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">7-Day Activity</CardTitle>
                <CardDescription>Calls, qualified leads, and meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={profile.weeklyActivity}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calls" name="Calls" fill="hsl(var(--primary))" />
                    <Bar dataKey="qualified" name="Qualified" fill="#22c55e" />
                    <Bar dataKey="meetings" name="Meetings" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Disposition Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Call Outcomes</CardTitle>
                <CardDescription>All-time disposition breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                      {pieData.slice(0, 6).map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-xs">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="truncate">{item.name}</span>
                          <span className="font-medium ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No call data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Best Calling Hours */}
          {profile.bestHours.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Best Calling Hours
                </CardTitle>
                <CardDescription>Hours with highest connect rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {profile.bestHours.map((hour, i) => (
                    <div
                      key={hour.hour}
                      className={`text-center p-4 rounded-lg ${
                        i === 0
                          ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                          : "bg-muted/50"
                      }`}
                    >
                      <p className="text-2xl font-bold">
                        {hour.hour > 12 ? hour.hour - 12 : hour.hour}:00{" "}
                        {hour.hour >= 12 ? "PM" : "AM"}
                      </p>
                      <p className="text-lg font-semibold text-green-600">{hour.connectRate}%</p>
                      <p className="text-xs text-muted-foreground">
                        {hour.connected}/{hour.calls} connected
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          {/* Portfolio Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profile.leadPortfolio.total}</p>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                    <Flame className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profile.leadPortfolio.byPriority.hot}</p>
                    <p className="text-sm text-muted-foreground">Hot Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profile.leadPortfolio.needsFollowUp}</p>
                    <p className="text-sm text-muted-foreground">Need Follow-up</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profile.leadPortfolio.avgFitScore || "—"}</p>
                    <p className="text-sm text-muted-foreground">Avg Fit Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lead Status Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Lead Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(profile.leadPortfolio.byStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
                  >
                    <Badge variant="outline" className="capitalize">
                      {status.replace(/-/g, " ")}
                    </Badge>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Leads */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Priority Leads</CardTitle>
              <CardDescription>Hot leads and high-fit opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.topLeads.length > 0 ? (
                <div className="space-y-2">
                  {profile.topLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{lead.contactName}</p>
                        <p className="text-sm text-muted-foreground truncate">{lead.companyName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.priority === "hot" && (
                          <Badge variant="destructive" className="text-xs">
                            Hot
                          </Badge>
                        )}
                        {lead.fitScore && (
                          <Badge
                            variant="outline"
                            className={
                              lead.fitScore >= 70
                                ? "border-green-500 text-green-700"
                                : "border-amber-500 text-amber-700"
                            }
                          >
                            {lead.fitScore}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="capitalize text-xs">
                          {lead.status}
                        </Badge>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No high-priority leads</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Calls</CardTitle>
              <CardDescription>Last 15 calls with outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.recentCalls.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {profile.recentCalls.map((call) => (
                      <div
                        key={call.id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            call.disposition === "qualified" ||
                            call.disposition === "meeting-booked"
                              ? "bg-green-100 text-green-600"
                              : call.disposition === "no-answer" ||
                                  call.disposition === "not-interested"
                                ? "bg-red-100 text-red-600"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {call.disposition === "qualified" ||
                          call.disposition === "meeting-booked" ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : call.disposition === "no-answer" ? (
                            <PhoneMissed className="h-5 w-5" />
                          ) : (
                            <Phone className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              className="font-medium truncate cursor-pointer hover:text-primary"
                              onClick={() =>
                                call.leadId &&
                                setSelectedLead({
                                  id: call.leadId,
                                  contactName: call.leadName,
                                  companyName: call.companyName,
                                })
                              }
                            >
                              {call.leadName}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                call.disposition === "qualified"
                                  ? "bg-green-100 text-green-700"
                                  : call.disposition === "meeting-booked"
                                    ? "bg-blue-100 text-blue-700"
                                    : ""
                              }`}
                            >
                              {DISPOSITION_LABELS[call.disposition] || call.disposition}
                            </Badge>
                            {call.sentimentScore && (
                              <Badge variant="outline" className="text-xs">
                                Sentiment: {call.sentimentScore}/5
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{call.companyName}</p>
                          {call.keyTakeaways && (
                            <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                              {call.keyTakeaways}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">
                            {call.duration
                              ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                              : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No call history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coaching Tab */}
        <TabsContent value="coaching" className="space-y-4">
          {profile.coachingInsights.avgOverallScore !== null ? (
            <>
              {/* Overall Score */}
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Overall Call Quality Score
                      </p>
                      <p className="text-5xl font-bold mt-2">
                        {profile.coachingInsights.avgOverallScore}
                        <span className="text-2xl text-muted-foreground">/100</span>
                      </p>
                    </div>
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center ${
                        profile.coachingInsights.avgOverallScore >= 80
                          ? "bg-green-100 text-green-600"
                          : profile.coachingInsights.avgOverallScore >= 60
                            ? "bg-amber-100 text-amber-600"
                            : "bg-red-100 text-red-600"
                      }`}
                    >
                      <Star className="h-10 w-10" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skill Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Skill Breakdown</CardTitle>
                    <CardDescription>Average scores across reviewed calls</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SkillBar
                      label="Opening"
                      score={profile.coachingInsights.avgOpeningScore}
                      color="#8b5cf6"
                    />
                    <SkillBar
                      label="Discovery"
                      score={profile.coachingInsights.avgDiscoveryScore}
                      color="#3b82f6"
                    />
                    <SkillBar
                      label="Listening"
                      score={profile.coachingInsights.avgListeningScore}
                      color="#22c55e"
                    />
                    <SkillBar
                      label="Closing"
                      score={profile.coachingInsights.avgClosingScore}
                      color="#f59e0b"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Development Focus</CardTitle>
                    <CardDescription>Strengths and areas for improvement</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.coachingInsights.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-2">Strengths</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.coachingInsights.strengths.map((s) => (
                            <Badge
                              key={s}
                              className="bg-green-100 text-green-700 hover:bg-green-100"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile.coachingInsights.areasForImprovement.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-600 mb-2">
                          Areas for Improvement
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {profile.coachingInsights.areasForImprovement.map((a) => (
                            <Badge
                              key={a}
                              className="bg-amber-100 text-amber-700 hover:bg-amber-100"
                            >
                              <Target className="h-3 w-3 mr-1" />
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Feedback */}
              {profile.coachingInsights.recentFeedback.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Recent Manager Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profile.coachingInsights.recentFeedback.map((feedback, i) => (
                        <div key={i} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">Score: {feedback.score}/100</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(feedback.date), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{feedback.summary}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No coaching data available</p>
                  <p className="text-sm mt-1">
                    Call quality scores will appear here after manager reviews
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        lead={selectedLead}
      />
    </div>
  );
}
