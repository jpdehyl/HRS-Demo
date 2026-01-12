import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  Phone,
  Target,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Award,
  BarChart3,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  PhoneCall,
  PhoneMissed,
  Mail,
  User,
} from "lucide-react";
import { Link } from "wouter";

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

interface SdrDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sdr: SdrLeaderboardData | null;
  teamAverage?: {
    calls: number;
    qualified: number;
    meetings: number;
    connectRate: number;
  };
}

interface SdrDetails {
  sdr: {
    id: string;
    name: string;
    email: string;
    timezone: string | null;
    isActive: boolean;
  };
  stats: {
    totalCalls: number;
    totalQualified: number;
    totalMeetings: number;
    avgCallDuration: number;
    connectRate: number;
    conversionRate: number;
  };
  recentCalls: Array<{
    id: string;
    leadName: string;
    companyName: string;
    disposition: string;
    duration: number | null;
    startedAt: string;
  }>;
  assignedLeads: Array<{
    id: string;
    companyName: string;
    contactName: string;
    status: string;
    fitScore: number | null;
  }>;
  dispositionBreakdown: Record<string, number>;
}

const DISPOSITION_COLORS: Record<string, string> = {
  qualified: "bg-green-500",
  "meeting-booked": "bg-blue-500",
  connected: "bg-purple-500",
  "callback-scheduled": "bg-amber-500",
  "not-interested": "bg-red-500",
  "no-answer": "bg-gray-500",
  voicemail: "bg-slate-400",
  "wrong-number": "bg-red-600",
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
};

function StatCard({
  label,
  value,
  icon,
  trend,
  comparison,
  comparisonLabel = "vs team avg",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  comparison?: number;
  comparisonLabel?: string;
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {comparison !== undefined && (
        <div
          className={`text-xs mt-1 flex items-center gap-1 ${
            comparison > 0
              ? "text-green-600"
              : comparison < 0
              ? "text-red-500"
              : "text-muted-foreground"
          }`}
        >
          {comparison > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : comparison < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : null}
          {comparison > 0 ? "+" : ""}
          {comparison.toFixed(1)}% {comparisonLabel}
        </div>
      )}
    </div>
  );
}

function DispositionBar({
  breakdown,
  total,
}: {
  breakdown: Record<string, number>;
  total: number;
}) {
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {Object.entries(breakdown).map(([disposition, count]) => {
          const percentage = (count / total) * 100;
          if (percentage === 0) return null;
          return (
            <div
              key={disposition}
              className={`${DISPOSITION_COLORS[disposition] || "bg-gray-400"}`}
              style={{ width: `${percentage}%` }}
              title={`${DISPOSITION_LABELS[disposition] || disposition}: ${count} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(breakdown).map(([disposition, count]) => {
          if (count === 0) return null;
          return (
            <div key={disposition} className="flex items-center gap-1.5 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${DISPOSITION_COLORS[disposition] || "bg-gray-400"}`}
              />
              <span className="text-muted-foreground">
                {DISPOSITION_LABELS[disposition] || disposition}:
              </span>
              <span className="font-medium">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SdrDetailModal({
  open,
  onOpenChange,
  sdr,
  teamAverage,
}: SdrDetailModalProps) {
  const { data: details, isLoading } = useQuery<SdrDetails>({
    queryKey: ["/api/sdrs", sdr?.sdrId, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/sdrs/${sdr?.sdrId}/details`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch SDR details");
      return res.json();
    },
    enabled: open && !!sdr?.sdrId,
  });

  if (!sdr) return null;

  const connectRateDiff = teamAverage
    ? sdr.connectRate - teamAverage.connectRate
    : undefined;
  const qualifiedDiff =
    teamAverage && teamAverage.qualified > 0
      ? ((sdr.qualified - teamAverage.qualified) / teamAverage.qualified) * 100
      : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{sdr.sdrName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                {details?.sdr?.email && (
                  <>
                    <Mail className="h-3 w-3" />
                    {details.sdr.email}
                  </>
                )}
                {details?.sdr?.timezone && (
                  <Badge variant="outline" className="text-xs">
                    {details.sdr.timezone}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calls">Recent Calls</TabsTrigger>
              <TabsTrigger value="leads">Assigned Leads</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Total Calls"
                  value={sdr.calls}
                  icon={<Phone className="h-4 w-4" />}
                />
                <StatCard
                  label="Connect Rate"
                  value={`${sdr.connectRate.toFixed(1)}%`}
                  icon={<PhoneCall className="h-4 w-4" />}
                  comparison={connectRateDiff}
                />
                <StatCard
                  label="Qualified"
                  value={sdr.qualified}
                  icon={<Target className="h-4 w-4" />}
                  comparison={qualifiedDiff}
                />
                <StatCard
                  label="Meetings"
                  value={sdr.meetings}
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>

              {/* Talk Time */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Talk Time This Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold">
                    {Math.floor(sdr.talkTimeMinutes / 60)}h{" "}
                    {Math.round(sdr.talkTimeMinutes % 60)}m
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Avg {sdr.calls > 0 ? (sdr.talkTimeMinutes / sdr.calls).toFixed(1) : 0} min per
                    call
                  </p>
                </CardContent>
              </Card>

              {/* Disposition Breakdown */}
              {details?.dispositionBreakdown && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Call Outcomes Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <DispositionBar
                      breakdown={details.dispositionBreakdown}
                      total={sdr.calls}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Performance vs Team */}
              {teamAverage && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Performance vs Team Average
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Connect Rate</span>
                        <span>
                          {sdr.connectRate.toFixed(1)}% vs {teamAverage.connectRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute h-full bg-primary/30 rounded-full"
                          style={{ width: `${Math.min(teamAverage.connectRate, 100)}%` }}
                        />
                        <div
                          className={`absolute h-full rounded-full ${sdr.connectRate >= teamAverage.connectRate ? "bg-green-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.min(sdr.connectRate, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Qualified Leads</span>
                        <span>
                          {sdr.qualified} vs {teamAverage.qualified.toFixed(1)} avg
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <Progress
                          value={
                            teamAverage.qualified > 0
                              ? (sdr.qualified / (teamAverage.qualified * 2)) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="calls" className="mt-4">
              {details?.recentCalls && details.recentCalls.length > 0 ? (
                <div className="space-y-2">
                  {details.recentCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
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
                        <p className="font-medium text-sm truncate">
                          {call.leadName || "Unknown Contact"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {call.companyName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent calls</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="leads" className="mt-4">
              {details?.assignedLeads && details.assignedLeads.length > 0 ? (
                <div className="space-y-2">
                  {details.assignedLeads.slice(0, 10).map((lead) => (
                    <Link key={lead.id} href={`/leads?id=${lead.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{lead.contactName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.companyName}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {lead.status}
                        </Badge>
                        {lead.fitScore !== null && (
                          <div
                            className={`text-sm font-bold ${
                              lead.fitScore >= 70
                                ? "text-green-600"
                                : lead.fitScore >= 40
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }`}
                          >
                            {lead.fitScore}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  {details.assignedLeads.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground pt-2">
                      +{details.assignedLeads.length - 10} more leads
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No assigned leads</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Link href="/team">
            <Button>View Full Profile</Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
