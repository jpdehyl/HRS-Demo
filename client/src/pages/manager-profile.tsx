import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Mail,
  User,
  Briefcase,
  Trophy,
  Star,
  ChevronRight,
  Building2,
  GraduationCap,
  MessageSquare,
  UserCheck,
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
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";

interface ManagerProfile {
  manager: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    title: string | null;
    bio: string | null;
    coachingStyle: string | null;
    specialties: string | null;
    yearsExperience: number | null;
    certifications: string | null;
    isActive: boolean;
    createdAt: string;
  };
  team: Array<{
    id: string;
    name: string;
    email: string;
    performance: {
      weekCalls: number;
      weekQualified: number;
      weekMeetings: number;
      connectRate: number;
      trend: number;
    };
  }>;
  teamMetrics: {
    totalSdrs: number;
    totalCalls: number;
    totalQualified: number;
    totalMeetings: number;
    avgConnectRate: number;
    avgCoachingScore: number;
    coachingSessionsGiven: number;
    weekCalls: number;
    weekQualified: number;
    weekMeetings: number;
    lastWeekCalls: number;
    lastWeekQualified: number;
    lastWeekMeetings: number;
  };
  trends: {
    callsTrend: number;
    qualifiedTrend: number;
    meetingsTrend: number;
  };
  weeklyActivity: Array<{ date: string; calls: number; qualified: number; meetings: number }>;
  topPerformers: Array<{ name: string; metric: string; value: number }>;
  recentCoachingSessions: Array<{
    id: string;
    sdrName: string;
    date: string;
    score: number;
    summary: string;
  }>;
  achievements: Array<{ title: string; description: string; date?: string; icon: string }>;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

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
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            {trend !== undefined && (
              <div className={`flex items-center text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ACHIEVEMENT_ICONS: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  graduation: <GraduationCap className="h-5 w-5" />,
};

export default function ManagerProfilePage() {
  const { managerId } = useParams<{ managerId: string }>();

  const { data: profile, isLoading, error } = useQuery<ManagerProfile>({
    queryKey: ["/api/managers", managerId, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/managers/${managerId}/profile`);
      if (!res.ok) throw new Error("Failed to fetch manager profile");
      return res.json();
    },
    enabled: !!managerId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6">
        <Link href="/team">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Manager not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { manager, team, teamMetrics, trends, weeklyActivity, topPerformers, recentCoachingSessions, achievements } = profile;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Link href="/team">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team
        </Button>
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="lg:w-80 shrink-0">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(manager.name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold">{manager.name}</h1>
              <p className="text-muted-foreground">{manager.title || "Sales Manager"}</p>
              <Badge variant="outline" className="mt-2">
                {manager.isActive ? "Active" : "Inactive"}
              </Badge>

              <div className="w-full mt-6 space-y-3 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{manager.email}</span>
                </div>
                {manager.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{manager.phone}</span>
                  </div>
                )}
                {manager.yearsExperience && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{manager.yearsExperience} years experience</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{teamMetrics.totalSdrs} team members</span>
                </div>
              </div>

              {manager.bio && (
                <div className="w-full mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{manager.bio}</p>
                </div>
              )}

              {manager.coachingStyle && (
                <div className="w-full mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Coaching Style</p>
                  <p className="text-sm">{manager.coachingStyle}</p>
                </div>
              )}

              {manager.specialties && (
                <div className="w-full mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Specialties</p>
                  <div className="flex flex-wrap gap-1">
                    {manager.specialties.split(",").map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {s.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Team Calls This Week"
              value={teamMetrics.weekCalls}
              trend={trends.callsTrend}
              icon={<Phone className="h-5 w-5" />}
            />
            <StatCard
              label="Qualified Leads"
              value={teamMetrics.weekQualified}
              trend={trends.qualifiedTrend}
              icon={<Target className="h-5 w-5" />}
            />
            <StatCard
              label="Meetings Booked"
              value={teamMetrics.weekMeetings}
              trend={trends.meetingsTrend}
              icon={<Calendar className="h-5 w-5" />}
            />
            <StatCard
              label="Avg Connect Rate"
              value={`${teamMetrics.avgConnectRate}%`}
              icon={<UserCheck className="h-5 w-5" />}
            />
          </div>

          <Tabs defaultValue="team" className="space-y-4">
            <TabsList>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
              <TabsTrigger value="coaching">Coaching</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Team Activity (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyActivity}>
                        <defs>
                          <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorQualified" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="calls" stroke="#3b82f6" fill="url(#colorCalls)" name="Calls" />
                        <Area type="monotone" dataKey="qualified" stroke="#22c55e" fill="url(#colorQualified)" name="Qualified" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Team Members</CardTitle>
                  <CardDescription>Click to view SDR profile</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="space-y-2">
                      {team.map((sdr) => (
                        <Link key={sdr.id} href={`/team/${sdr.id}`}>
                          <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>{getInitials(sdr.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{sdr.name}</p>
                                <p className="text-xs text-muted-foreground">{sdr.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-right">
                                <p className="font-medium">{sdr.performance.weekCalls} calls</p>
                                <p className="text-xs text-muted-foreground">{sdr.performance.connectRate}% connect</p>
                              </div>
                              <div className={`flex items-center ${sdr.performance.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {sdr.performance.trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coaching" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Coaching Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sessions Given</span>
                      <span className="font-bold">{teamMetrics.coachingSessionsGiven}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Team Score</span>
                      <span className="font-bold">{teamMetrics.avgCoachingScore}/100</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topPerformers.slice(0, 3).map((performer, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0 ? "bg-yellow-100 text-yellow-700" :
                              i === 1 ? "bg-gray-100 text-gray-700" :
                              "bg-orange-100 text-orange-700"
                            }`}>
                              {i + 1}
                            </div>
                            <span className="text-sm font-medium">{performer.name}</span>
                          </div>
                          <Badge variant="secondary">{performer.value} {performer.metric}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Recent Coaching Sessions</CardTitle>
                  <CardDescription>Manager-only: coaching insights for your team</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {recentCoachingSessions.map((session) => (
                        <div key={session.id} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{session.sdrName}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Score: {session.score}/100</Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(session.date), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{session.summary}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement, i) => (
                  <Card key={i} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          {ACHIEVEMENT_ICONS[achievement.icon] || <Award className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-semibold">{achievement.title}</p>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          {achievement.date && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(achievement.date), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
