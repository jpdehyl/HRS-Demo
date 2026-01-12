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
  DollarSign,
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
  MapPin,
  Handshake,
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

interface AEProfile {
  ae: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    region: string | null;
    specialty: string | null;
    title: string | null;
    bio: string | null;
    dealFocus: string | null;
    yearsExperience: number | null;
    quotaAttainment: number | null;
    avgDealSize: number | null;
    isActive: boolean;
    createdAt: string;
  };
  pipeline: {
    totalDeals: number;
    totalValue: number;
    avgDealSize: number;
    winRate: number;
    dealsWonThisMonth: number;
    dealsWonThisQuarter: number;
    quotaProgress: number;
    byStage: Array<{ stage: string; count: number; value: number }>;
  };
  recentHandoffs: Array<{
    id: string;
    leadName: string;
    companyName: string;
    sdrName: string;
    handoffDate: string;
    status: string;
    dealValue: number | null;
  }>;
  monthlyActivity: Array<{ month: string; deals: number; revenue: number }>;
  achievements: Array<{ title: string; description: string; date?: string; icon: string }>;
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
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
  dollar: <DollarSign className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  target: <Target className="h-5 w-5" />,
  handshake: <Handshake className="h-5 w-5" />,
};

const STAGE_COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

export default function AEProfilePage() {
  const { aeId } = useParams<{ aeId: string }>();

  const { data: profile, isLoading, error } = useQuery<AEProfile>({
    queryKey: ["/api/account-executives", aeId, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/account-executives/${aeId}/profile`);
      if (!res.ok) throw new Error("Failed to fetch AE profile");
      return res.json();
    },
    enabled: !!aeId,
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
            <p className="text-lg font-medium">Account Executive not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { ae, pipeline, recentHandoffs, monthlyActivity, achievements } = profile;

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
                  {getInitials(ae.name)}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold">{ae.name}</h1>
              <p className="text-muted-foreground">{ae.title || "Account Executive"}</p>
              <Badge variant="outline" className="mt-2">
                {ae.isActive ? "Active" : "Inactive"}
              </Badge>

              <div className="w-full mt-6 space-y-3 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{ae.email}</span>
                </div>
                {ae.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{ae.phone}</span>
                  </div>
                )}
                {ae.region && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{ae.region} Region</span>
                  </div>
                )}
                {ae.specialty && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{ae.specialty}</span>
                  </div>
                )}
                {ae.yearsExperience && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{ae.yearsExperience} years experience</span>
                  </div>
                )}
              </div>

              {ae.bio && (
                <div className="w-full mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{ae.bio}</p>
                </div>
              )}

              {ae.dealFocus && (
                <div className="w-full mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Deal Focus</p>
                  <p className="text-sm">{ae.dealFocus}</p>
                </div>
              )}

              {ae.quotaAttainment && (
                <div className="w-full mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quota Attainment</p>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.min(ae.quotaAttainment, 100)} className="flex-1" />
                    <span className="text-sm font-bold">{ae.quotaAttainment}%</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Deals"
              value={pipeline.totalDeals}
              icon={<Briefcase className="h-5 w-5" />}
            />
            <StatCard
              label="Pipeline Value"
              value={formatCurrency(pipeline.totalValue)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              label="Win Rate"
              value={`${pipeline.winRate}%`}
              icon={<Target className="h-5 w-5" />}
            />
            <StatCard
              label="Deals Won This Month"
              value={pipeline.dealsWonThisMonth}
              icon={<Trophy className="h-5 w-5" />}
            />
          </div>

          <Tabs defaultValue="pipeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="handoffs">Recent Handoffs</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipeline.byStage} layout="vertical">
                          <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="stage" fontSize={12} tickLine={false} axisLine={false} width={100} />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Monthly Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyActivity}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}K`} />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#colorRevenue)" name="Revenue" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="handoffs" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Recent Lead Handoffs from SDRs</CardTitle>
                  <CardDescription>Leads transferred from Sales Development</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {recentHandoffs.map((handoff) => (
                        <div key={handoff.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="font-medium">{handoff.leadName}</p>
                            <p className="text-sm text-muted-foreground">{handoff.companyName}</p>
                            <p className="text-xs text-muted-foreground">From: {handoff.sdrName}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              handoff.status === "won" ? "default" :
                              handoff.status === "lost" ? "destructive" :
                              "secondary"
                            }>
                              {handoff.status}
                            </Badge>
                            {handoff.dealValue && (
                              <p className="text-sm font-medium mt-1">{formatCurrency(handoff.dealValue)}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(handoff.handoffDate), { addSuffix: true })}
                            </p>
                          </div>
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
