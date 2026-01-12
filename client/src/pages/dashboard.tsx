import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { CallQueue } from "@/components/call-queue";
import { DialingModal } from "@/components/dialing-modal";
import { ROIStats } from "@/components/roi-stats";
import { SdrDetailModal } from "@/components/sdr-detail-modal";
import { LeadDetailModal } from "@/components/lead-detail-modal";
import { TimeRangeSelector, type TimeRange, getTimeRangeLabel } from "@/components/time-range-selector";
import { Sparkline } from "@/components/sparkline";
import { InsightsCard } from "@/components/insights-card";
import { GoalProgressCard } from "@/components/goal-progress-card";
import { DrillDownModal } from "@/components/drill-down-modal";
import { useDashboardUpdates } from "@/hooks/use-dashboard-updates";
import { 
  Users, 
  Phone, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  DollarSign,
  Target,
  Calendar,
  Zap,
  AlertCircle,
  FileSearch,
  ChevronRight,
  Trophy,
  Crown,
  Medal,
  Award
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
  Tooltip
} from "recharts";

interface AnomalyData {
  isAnomaly: boolean;
  type: "spike" | "drop" | null;
  severity: number;
}

interface DashboardMetrics {
  hero: {
    pipelineValue: number;
    pipelineLeads: number;
    conversionRate: number;
    conversionTrend: number;
    callsToday: number;
    callsInRange: number;
    callsTrend: number;
    meetingsBooked: number;
    qualifiedLeads: number;
    sparklines: {
      calls: number[];
      qualified: number[];
      meetings: number[];
      conversion: number[];
    };
    anomalies: {
      calls: AnomalyData;
      qualified: AnomalyData;
      meetings: AnomalyData;
      conversion: AnomalyData;
    };
  };
  timeRange: string;
  rangeDays: number;
  funnel: {
    totalCalls: number;
    connected: number;
    qualified: number;
    meetings: number;
  };
  dispositionBreakdown: Record<string, number>;
  dailyActivity: Array<{ date: string; calls: number; qualified: number }>;
  sdrLeaderboard: Array<{
    sdrId: string;
    sdrName: string;
    userId: string | null;
    calls: number;
    qualified: number;
    meetings: number;
    connectRate: number;
    talkTimeMinutes: number;
  }>;
  actionItems: {
    callsNeedingAnalysis: Array<{ id: string; toNumber: string; duration: number | null; startedAt: Date }>;
    hotLeads: Array<{ id: string; companyName: string; contactName: string; phone: string | null }>;
    leadsWithoutResearch: Array<{ id: string; companyName: string; contactName: string }>;
  };
  teamSize: {
    sdrs: number;
    aes: number;
    leads: number;
  };
  roiTracking: {
    callsWithPrep: number;
    callsWithoutPrep: number;
    meetingsWithPrep: number;
    meetingsWithoutPrep: number;
  };
  goalTracking: {
    daysRemaining: number;
    daysElapsed: number;
    metrics: {
      calls: { current: number; goal: number; projected: number; dailyRate: number };
      qualified: { current: number; goal: number; projected: number; dailyRate: number };
      meetings: { current: number; goal: number; projected: number; dailyRate: number };
    };
  };
  isPrivileged: boolean;
  currentUserId: string;
}

const DISPOSITION_COLORS: Record<string, string> = {
  "qualified": "#22c55e",
  "meeting-booked": "#3b82f6",
  "connected": "#8b5cf6",
  "callback-scheduled": "#f59e0b",
  "not-interested": "#ef4444",
  "no-answer": "#6b7280",
  "voicemail": "#94a3b8",
  "wrong-number": "#dc2626",
  "unknown": "#9ca3af",
};

const DISPOSITION_LABELS: Record<string, string> = {
  "qualified": "Qualified",
  "meeting-booked": "Meeting Booked",
  "connected": "Connected",
  "callback-scheduled": "Callback",
  "not-interested": "Not Interested",
  "no-answer": "No Answer",
  "voicemail": "Voicemail",
  "wrong-number": "Wrong Number",
  "unknown": "Unknown",
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

function HeroMetric({
  label,
  value,
  trend,
  icon,
  prefix = "",
  suffix = "",
  loading = false,
  accentColor = "primary",
  sparklineData,
  anomaly
}: {
  label: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  accentColor?: "primary" | "green" | "blue" | "purple";
  sparklineData?: number[];
  anomaly?: AnomalyData;
}) {
  const colorMap = {
    primary: "hsl(var(--primary))",
    green: "#22c55e",
    blue: "#3b82f6",
    purple: "#8b5cf6",
  };

  // Determine if we should show anomaly styling
  const showAnomaly = anomaly?.isAnomaly && anomaly.severity > 0.3;
  const anomalyColor = anomaly?.type === "spike" ? "ring-green-500 bg-green-50 dark:bg-green-950/20" : "ring-amber-500 bg-amber-50 dark:bg-amber-950/20";

  return (
    <Card className={`border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 ${showAnomaly ? `ring-2 ${anomalyColor}` : ''}`}>
      <CardContent className="pt-6 pb-6 text-center relative">
        {showAnomaly && (
          <div className={`absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold rounded ${anomaly?.type === "spike" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
            {anomaly?.type === "spike" ? "HIGH" : "LOW"}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-36">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-5xl font-bold tracking-tight" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
              {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            {sparklineData && sparklineData.length > 0 && (
              <div className="pt-2 px-4">
                <Sparkline
                  data={sparklineData}
                  color={colorMap[accentColor]}
                  height={28}
                  showTrend={true}
                />
              </div>
            )}
            {trend !== undefined && trend !== 0 && (
              <div className={`inline-flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {trend > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(trend)}% vs prev
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelStage({
  label,
  value,
  percentage,
  color,
  onClick
}: {
  label: string;
  value: number;
  percentage: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div className={`flex-1 text-center ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div
        className={`mx-auto mb-2 flex items-center justify-center rounded-md text-white font-bold text-xl ${onClick ? 'hover:opacity-80 transition-opacity' : ''}`}
        style={{
          backgroundColor: color,
          width: `${Math.max(60, percentage * 1.5)}%`,
          height: "48px",
          transition: "width 0.5s ease-out, opacity 0.2s ease"
        }}
      >
        {value}
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{percentage}%</p>
    </div>
  );
}

function LeaderboardRow({
  rank,
  name,
  qualified,
  meetings,
  calls,
  connectRate,
  onClick
}: {
  rank: number;
  name: string;
  qualified: number;
  meetings: number;
  calls: number;
  connectRate: number;
  onClick?: () => void;
}) {
  const isTopThree = rank <= 3;
  const rankBg = rank === 1
    ? "bg-gradient-to-br from-yellow-400 to-orange-500"
    : rank === 2
    ? "bg-gradient-to-br from-gray-300 to-gray-400"
    : rank === 3
    ? "bg-gradient-to-br from-orange-300 to-orange-400"
    : "bg-muted";

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-all duration-200 border-b border-border last:border-0 ${onClick ? 'cursor-pointer' : ''}`}
      data-testid={`leaderboard-row-${rank}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${rankBg} ${isTopThree ? 'text-white' : ''} font-semibold`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base truncate">{name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span>{calls} calls</span>
          <span>•</span>
          <span className="text-green-600 font-medium">{connectRate}% connect</span>
        </div>
      </div>
      <div className="text-center min-w-[80px]">
        <p className="text-2xl font-bold text-green-600">{qualified}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">qualified</p>
      </div>
      <div className="text-center min-w-[80px]">
        <p className="text-2xl font-bold text-blue-600">{meetings}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">meetings</p>
      </div>
      {onClick && (
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

function ActionItem({
  icon,
  title,
  subtitle,
  href,
  variant = "default",
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
  variant?: "default" | "warning" | "success";
  onClick?: () => void;
}) {
  const variantClasses = {
    default: "bg-muted/50",
    warning: "bg-yellow-50 dark:bg-yellow-950/30",
    success: "bg-green-50 dark:bg-green-950/30",
  };

  const content = (
    <div
      className={`flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer ${variantClasses[variant]}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Types for modals
interface SdrLeaderboardData {
  sdrId: string;
  sdrName: string;
  userId: string | null;
  calls: number;
  qualified: number;
  meetings: number;
  connectRate: number;
  talkTimeMinutes: number;
}

interface LeadSummary {
  id: string;
  companyName: string;
  contactName: string;
  contactTitle?: string | null;
  contactEmail?: string;
  contactPhone?: string | null;
  status: string;
  fitScore?: number | null;
  priority?: string | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dialingLead, setDialingLead] = useState<any | null>(null);
  const [selectedSdr, setSelectedSdr] = useState<SdrLeaderboardData | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadSummary | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [drillDown, setDrillDown] = useState<{ type: "disposition" | "funnel"; filter: string; label: string } | null>(null);

  // Real-time updates via WebSocket
  const { isConnected: wsConnected } = useDashboardUpdates();

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/metrics?range=${timeRange}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      return res.json();
    },
  });

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["/api/leads"],
  });

  const handleCall = (lead: any) => {
    setDialingLead(lead);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const pieData = metrics?.dispositionBreakdown 
    ? Object.entries(metrics.dispositionBreakdown).map(([name, value]) => ({
        name: DISPOSITION_LABELS[name] || name,
        value,
        color: DISPOSITION_COLORS[name] || "#9ca3af"
      }))
    : [];

  const totalDispositions = pieData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight" data-testid="text-greeting">
            {getGreeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-lg">
            {metrics?.isPrivileged
              ? "Your team's performance at a glance"
              : "Your sales performance at a glance"}
          </p>
        </div>
        <TimeRangeSelector
          value={timeRange}
          onChange={setTimeRange}
          className="self-start sm:self-auto"
        />
      </div>

      {/* Call Queue - Priority #1 for SDRs */}
      <CallQueue
        leads={leads}
        onCall={handleCall}
        onLeadClick={(lead) => setSelectedLead({
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          contactPhone: lead.contactPhone,
          status: lead.status,
          fitScore: lead.fitScore,
          priority: lead.priority,
        })}
      />

      {/* ROI Stats - Show value of using the tool */}
      {!metrics?.isPrivileged && metrics?.roiTracking && (
        <ROIStats
          callsWithPrep={metrics.roiTracking.callsWithPrep}
          callsWithoutPrep={metrics.roiTracking.callsWithoutPrep}
          meetingsWithPrep={metrics.roiTracking.meetingsWithPrep}
          meetingsWithoutPrep={metrics.roiTracking.meetingsWithoutPrep}
        />
      )}

      {/* Performance Summary - Key metrics */}
      {metrics && (
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">This Week's Performance</CardTitle>
              </div>
              <Badge variant="secondary" className={`gap-1 ${wsConnected ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}`}>
                <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {wsConnected ? 'Live' : 'Connecting...'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {metrics.hero.callsInRange}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Total Calls
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {metrics.hero.qualifiedLeads}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Qualified
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {metrics.hero.meetingsBooked}
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Meetings
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600 mb-1">
                  {metrics.hero.conversionRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Conv. Rate
                </div>
              </div>
            </div>

            {/* Quick insights */}
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-2">
              {metrics.hero.conversionTrend > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Conversion up {Math.abs(metrics.hero.conversionTrend).toFixed(1)}% vs previous period</span>
                </div>
              )}
              {metrics.hero.conversionTrend < 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <TrendingDown className="h-4 w-4" />
                  <span>Conversion down {Math.abs(metrics.hero.conversionTrend).toFixed(1)}% vs previous period</span>
                </div>
              )}
              {metrics.actionItems.hotLeads.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{metrics.actionItems.hotLeads.length} hot leads need attention</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroMetric
          label="Qualified Leads"
          value={metrics?.hero.qualifiedLeads || 0}
          icon={<Target className="h-5 w-5 text-green-600" />}
          loading={isLoading}
          accentColor="green"
          sparklineData={metrics?.hero.sparklines?.qualified}
          anomaly={metrics?.hero.anomalies?.qualified}
        />
        <HeroMetric
          label="Conversion Rate"
          value={metrics?.hero.conversionRate || 0}
          suffix="%"
          trend={metrics?.hero.conversionTrend}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          loading={isLoading}
          accentColor="blue"
          sparklineData={metrics?.hero.sparklines?.conversion}
          anomaly={metrics?.hero.anomalies?.conversion}
        />
        <HeroMetric
          label={`Calls (${getTimeRangeLabel(timeRange)})`}
          value={metrics?.hero.callsInRange || 0}
          trend={metrics?.hero.callsTrend}
          icon={<Phone className="h-5 w-5 text-purple-600" />}
          loading={isLoading}
          accentColor="purple"
          sparklineData={metrics?.hero.sparklines?.calls}
          anomaly={metrics?.hero.anomalies?.calls}
        />
        <HeroMetric
          label="Meetings Booked"
          value={metrics?.hero.meetingsBooked || 0}
          icon={<Calendar className="h-5 w-5 text-primary" />}
          loading={isLoading}
          accentColor="primary"
          sparklineData={metrics?.hero.sparklines?.meetings}
          anomaly={metrics?.hero.anomalies?.meetings}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{getTimeRangeLabel(timeRange)} Activity</CardTitle>
            <CardDescription>Calls and qualified leads over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metrics?.dailyActivity || []}>
                  <defs>
                    <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="qualifiedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#callsGradient)"
                    name="Total Calls"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="qualified" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fill="url(#qualifiedGradient)"
                    name="Qualified"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Call Outcomes</CardTitle>
            <CardDescription>Disposition breakdown for {getTimeRangeLabel(timeRange).toLowerCase()} (click to drill down)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Phone className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No calls in this period</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                      onClick={(data) => {
                        if (data && data.payload) {
                          const disposition = Object.keys(DISPOSITION_LABELS).find(
                            k => DISPOSITION_LABELS[k] === data.payload.name
                          ) || data.payload.name;
                          setDrillDown({
                            type: "disposition",
                            filter: disposition,
                            label: data.payload.name,
                          });
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.slice(0, 4).map((item) => {
                    const disposition = Object.keys(DISPOSITION_LABELS).find(
                      k => DISPOSITION_LABELS[k] === item.name
                    ) || item.name;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
                        onClick={() => setDrillDown({ type: "disposition", filter: disposition, label: item.name })}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
                        </div>
                        <span className="font-medium">
                          {Math.round((item.value / totalDispositions) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sales Funnel</CardTitle>
          <CardDescription>Conversion journey for {getTimeRangeLabel(timeRange).toLowerCase()} (click to drill down)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="flex items-end gap-4 py-4">
              <FunnelStage
                label="Total Calls"
                value={metrics?.funnel.totalCalls || 0}
                percentage={100}
                color="hsl(var(--primary))"
                onClick={() => setDrillDown({ type: "funnel", filter: "total", label: "Total Calls" })}
              />
              <div className="text-muted-foreground">
                <ChevronRight className="h-5 w-5" />
              </div>
              <FunnelStage
                label="Connected"
                value={metrics?.funnel.connected || 0}
                percentage={metrics?.funnel.totalCalls ? Math.round((metrics.funnel.connected / metrics.funnel.totalCalls) * 100) : 0}
                color="#8b5cf6"
                onClick={() => setDrillDown({ type: "funnel", filter: "connected", label: "Connected" })}
              />
              <div className="text-muted-foreground">
                <ChevronRight className="h-5 w-5" />
              </div>
              <FunnelStage
                label="Qualified"
                value={metrics?.funnel.qualified || 0}
                percentage={metrics?.funnel.totalCalls ? Math.round((metrics.funnel.qualified / metrics.funnel.totalCalls) * 100) : 0}
                color="#22c55e"
                onClick={() => setDrillDown({ type: "funnel", filter: "qualified", label: "Qualified" })}
              />
              <div className="text-muted-foreground">
                <ChevronRight className="h-5 w-5" />
              </div>
              <FunnelStage
                label="Meetings"
                value={metrics?.funnel.meetings || 0}
                percentage={metrics?.funnel.totalCalls ? Math.round((metrics.funnel.meetings / metrics.funnel.totalCalls) * 100) : 0}
                color="#3b82f6"
                onClick={() => setDrillDown({ type: "funnel", filter: "meetings", label: "Meetings Booked" })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {metrics?.isPrivileged && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-lg">SDR Leaderboard</CardTitle>
                <CardDescription>Top performers ({getTimeRangeLabel(timeRange).toLowerCase()})</CardDescription>
              </div>
              <Link href="/team">
                <Button variant="ghost" size="sm" data-testid="button-view-team">
                  View Team
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : metrics?.sdrLeaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Trophy className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No activity in this period</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {metrics?.sdrLeaderboard.slice(0, 5).map((sdr, index) => (
                    <LeaderboardRow
                      key={sdr.sdrId}
                      rank={index + 1}
                      name={sdr.sdrName}
                      qualified={sdr.qualified}
                      meetings={sdr.meetings}
                      calls={sdr.calls}
                      connectRate={sdr.connectRate}
                      onClick={() => setSelectedSdr(sdr)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className={metrics?.isPrivileged ? "" : "lg:col-span-2"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Action Required
            </CardTitle>
            <CardDescription>Items needing your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {(metrics?.actionItems.callsNeedingAnalysis.length || 0) > 0 && (
                  <ActionItem
                    icon={<AlertCircle className="h-5 w-5 text-yellow-600" />}
                    title={`${metrics?.actionItems.callsNeedingAnalysis.length} calls need analysis`}
                    subtitle="Review and get AI coaching feedback"
                    href="/coaching"
                    variant="warning"
                  />
                )}
                {metrics?.actionItems.hotLeads.slice(0, 2).map((lead) => (
                  <ActionItem
                    key={lead.id}
                    icon={<Target className="h-5 w-5 text-green-600" />}
                    title={lead.companyName}
                    subtitle={`${lead.contactName} - Qualified lead`}
                    variant="success"
                    onClick={() => setSelectedLead({
                      id: lead.id,
                      companyName: lead.companyName,
                      contactName: lead.contactName,
                      contactPhone: lead.phone,
                      status: 'qualified',
                    })}
                  />
                ))}
                {metrics?.actionItems.leadsWithoutResearch.slice(0, 2).map((lead) => (
                  <ActionItem
                    key={lead.id}
                    icon={<FileSearch className="h-5 w-5 text-muted-foreground" />}
                    title={lead.companyName}
                    subtitle={`${lead.contactName} - Needs research`}
                    onClick={() => setSelectedLead({
                      id: lead.id,
                      companyName: lead.companyName,
                      contactName: lead.contactName,
                      status: 'new',
                    })}
                  />
                ))}
                {(!metrics?.actionItems.callsNeedingAnalysis.length && 
                  !metrics?.actionItems.hotLeads.length && 
                  !metrics?.actionItems.leadsWithoutResearch.length) && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                      <Target className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs">No pending action items</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {!metrics?.isPrivileged && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/coaching">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-new-call">
                  <Phone className="h-4 w-4" />
                  Start New Call
                </Button>
              </Link>
              <Link href="/leads">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-view-leads">
                  <Users className="h-4 w-4" />
                  View Leads
                </Button>
              </Link>
              <Link href="/learning">
                <Button className="w-full justify-start gap-2" variant="outline" data-testid="button-learning">
                  <Trophy className="h-4 w-4" />
                  Learning Hub
                </Button>
              </Link>
              <Link href="/leads">
                <Button className="w-full justify-start gap-2 bg-[#2C88C9] hover:bg-[#2C88C9]/90 text-white" data-testid="button-import">
                  <Zap className="h-4 w-4" />
                  Import Leads
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <InsightsCard timeRange={timeRange} className="lg:col-span-2" />

        {metrics?.goalTracking && (
          <GoalProgressCard
            periodLabel="Monthly"
            metrics={[
              {
                label: "Calls",
                current: metrics.goalTracking.metrics.calls.current,
                goal: metrics.goalTracking.metrics.calls.goal,
                projected: metrics.goalTracking.metrics.calls.projected,
                daysRemaining: metrics.goalTracking.daysRemaining,
              },
              {
                label: "Qualified Leads",
                current: metrics.goalTracking.metrics.qualified.current,
                goal: metrics.goalTracking.metrics.qualified.goal,
                projected: metrics.goalTracking.metrics.qualified.projected,
                daysRemaining: metrics.goalTracking.daysRemaining,
              },
              {
                label: "Meetings Booked",
                current: metrics.goalTracking.metrics.meetings.current,
                goal: metrics.goalTracking.metrics.meetings.goal,
                projected: metrics.goalTracking.metrics.meetings.projected,
                daysRemaining: metrics.goalTracking.daysRemaining,
              },
            ]}
          />
        )}
      </div>

      <DialingModal
        open={!!dialingLead}
        onOpenChange={(open) => !open && setDialingLead(null)}
        lead={dialingLead}
      />

      {/* SDR Detail Modal - shows performance when clicking on leaderboard row */}
      <SdrDetailModal
        open={!!selectedSdr}
        onOpenChange={(open) => !open && setSelectedSdr(null)}
        sdr={selectedSdr}
        teamAverage={
          metrics?.sdrLeaderboard && metrics.sdrLeaderboard.length > 0
            ? {
                calls: metrics.sdrLeaderboard.reduce((sum, s) => sum + s.calls, 0) / metrics.sdrLeaderboard.length,
                qualified: metrics.sdrLeaderboard.reduce((sum, s) => sum + s.qualified, 0) / metrics.sdrLeaderboard.length,
                meetings: metrics.sdrLeaderboard.reduce((sum, s) => sum + s.meetings, 0) / metrics.sdrLeaderboard.length,
                connectRate: metrics.sdrLeaderboard.reduce((sum, s) => sum + s.connectRate, 0) / metrics.sdrLeaderboard.length,
              }
            : undefined
        }
      />

      {/* Lead Detail Modal - shows full intel when clicking on leads */}
      <LeadDetailModal
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        lead={selectedLead}
        onCall={(lead) => {
          setSelectedLead(null);
          setDialingLead(lead);
        }}
      />

      {/* Drill-down Modal - shows underlying data when clicking on charts */}
      <DrillDownModal
        open={!!drillDown}
        onOpenChange={(open) => !open && setDrillDown(null)}
        type={drillDown?.type || "disposition"}
        filter={drillDown?.filter || ""}
        filterLabel={drillDown?.label || ""}
        timeRange={timeRange}
        onLeadClick={(leadId) => {
          setDrillDown(null);
          // Navigate to leads page with the specific lead
          navigate(`/leads?id=${leadId}`);
        }}
      />
    </div>
  );
}
