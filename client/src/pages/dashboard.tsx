import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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

interface DashboardMetrics {
  hero: {
    pipelineValue: number;
    pipelineLeads: number;
    conversionRate: number;
    conversionTrend: number;
    callsToday: number;
    callsThisWeek: number;
    callsTrend: number;
    meetingsBooked: number;
    qualifiedLeads: number;
  };
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
  accentColor = "primary"
}: {
  label: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  accentColor?: "primary" | "green" | "blue" | "purple";
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      <CardContent className="pt-8 pb-8 text-center">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-6xl font-bold tracking-tight" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
              {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
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
  color 
}: { 
  label: string; 
  value: number; 
  percentage: number; 
  color: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div 
        className="mx-auto mb-2 flex items-center justify-center rounded-md text-white font-bold text-xl"
        style={{ 
          backgroundColor: color,
          width: `${Math.max(60, percentage * 1.5)}%`,
          height: "48px",
          transition: "width 0.5s ease-out"
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
  connectRate
}: {
  rank: number;
  name: string;
  qualified: number;
  meetings: number;
  calls: number;
  connectRate: number;
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
      className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/30 transition-all duration-200 border-b border-border last:border-0"
      data-testid={`leaderboard-row-${rank}`}
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
    </div>
  );
}

function ActionItem({ 
  icon, 
  title, 
  subtitle, 
  href, 
  variant = "default" 
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  href: string;
  variant?: "default" | "warning" | "success";
}) {
  const variantClasses = {
    default: "bg-muted/50",
    warning: "bg-yellow-50 dark:bg-yellow-950/30",
    success: "bg-green-50 dark:bg-green-950/30",
  };

  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer ${variantClasses[variant]}`}>
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

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
      <div className="flex flex-col gap-2 mb-2">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="text-greeting">
          {getGreeting()}, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          {metrics?.isPrivileged
            ? "Your team's performance at a glance"
            : "Your sales performance at a glance"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroMetric
          label="Pipeline Value"
          value={formatCurrency(metrics?.hero.pipelineValue || 0)}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          loading={isLoading}
          accentColor="green"
        />
        <HeroMetric
          label="Conversion Rate"
          value={metrics?.hero.conversionRate || 0}
          suffix="%"
          trend={metrics?.hero.conversionTrend}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          loading={isLoading}
          accentColor="blue"
        />
        <HeroMetric
          label="Calls This Week"
          value={metrics?.hero.callsThisWeek || 0}
          trend={metrics?.hero.callsTrend}
          icon={<Phone className="h-5 w-5 text-purple-600" />}
          loading={isLoading}
          accentColor="purple"
        />
        <HeroMetric
          label="Meetings Booked"
          value={metrics?.hero.meetingsBooked || 0}
          icon={<Calendar className="h-5 w-5 text-primary" />}
          loading={isLoading}
          accentColor="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">7-Day Activity</CardTitle>
            <CardDescription>Calls and qualified leads over the past week</CardDescription>
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
            <CardDescription>This week's disposition breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <Phone className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No calls this week</p>
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
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
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
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sales Funnel</CardTitle>
          <CardDescription>This week's conversion journey</CardDescription>
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
              />
              <div className="text-muted-foreground">
                <ChevronRight className="h-5 w-5" />
              </div>
              <FunnelStage 
                label="Connected" 
                value={metrics?.funnel.connected || 0} 
                percentage={metrics?.funnel.totalCalls ? Math.round((metrics.funnel.connected / metrics.funnel.totalCalls) * 100) : 0}
                color="#8b5cf6"
              />
              <div className="text-muted-foreground">
                <ChevronRight className="h-5 w-5" />
              </div>
              <FunnelStage 
                label="Qualified" 
                value={metrics?.funnel.qualified || 0} 
                percentage={metrics?.funnel.totalCalls ? Math.round((metrics.funnel.qualified / metrics.funnel.totalCalls) * 100) : 0}
                color="#22c55e"
              />
              <div className="text-muted-foreground">
                <ChevronRight className="h-5 w-5" />
              </div>
              <FunnelStage 
                label="Meetings" 
                value={metrics?.funnel.meetings || 0} 
                percentage={metrics?.funnel.totalCalls ? Math.round((metrics.funnel.meetings / metrics.funnel.totalCalls) * 100) : 0}
                color="#3b82f6"
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
                <CardDescription>Top performers this week</CardDescription>
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
                  <p className="text-sm">No activity this week</p>
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
                    href={`/coaching?phone=${encodeURIComponent(lead.phone || '')}`}
                    variant="success"
                  />
                ))}
                {metrics?.actionItems.leadsWithoutResearch.slice(0, 2).map((lead) => (
                  <ActionItem
                    key={lead.id}
                    icon={<FileSearch className="h-5 w-5 text-muted-foreground" />}
                    title={lead.companyName}
                    subtitle={`${lead.contactName} - Needs research`}
                    href="/leads"
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
      </div>
    </div>
  );
}
