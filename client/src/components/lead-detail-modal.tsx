import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Target,
  Clock,
  Calendar,
  TrendingUp,
  Briefcase,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  FileText,
  CheckCircle2,
  Loader2,
  ExternalLink,
  DollarSign,
  Users,
  Zap,
  PhoneCall,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format, formatDistanceToNow } from "date-fns";

interface LeadSummary {
  id: string;
  companyName: string;
  contactName: string;
  contactTitle?: string | null;
  contactEmail?: string;
  contactPhone?: string | null;
  contactLinkedIn?: string | null;
  companyWebsite?: string | null;
  companyIndustry?: string | null;
  companySize?: string | null;
  status: string;
  fitScore?: number | null;
  priority?: string | null;
  source?: string;
  qualificationNotes?: string | null;
  buySignals?: string | null;
  budget?: string | null;
  timeline?: string | null;
  decisionMakers?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  createdAt?: string;
}

interface LeadDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadSummary | null;
  onCall?: (lead: LeadSummary) => void;
}

interface LeadDetails {
  lead: LeadSummary;
  research: {
    id: string;
    companyIntel: string | null;
    contactIntel: string | null;
    painSignals: string | null;
    talkTrack: string | null;
    discoveryQuestions: string | null;
    objectionHandles: string | null;
    confidence: string | null;
    createdAt: string;
  } | null;
  callHistory: Array<{
    id: string;
    disposition: string | null;
    duration: number | null;
    startedAt: string;
    keyTakeaways: string | null;
    nextSteps: string | null;
    sdrNotes: string | null;
  }>;
  assignedSdr: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-100 text-blue-700" },
  researching: { label: "Researching", className: "bg-purple-100 text-purple-700" },
  contacted: { label: "Contacted", className: "bg-amber-100 text-amber-700" },
  engaged: { label: "Engaged", className: "bg-cyan-100 text-cyan-700" },
  qualified: { label: "Qualified", className: "bg-green-100 text-green-700" },
  "sent-to-ae": { label: "Sent to AE", className: "bg-indigo-100 text-indigo-700" },
  nurturing: { label: "Nurturing", className: "bg-orange-100 text-orange-700" },
  lost: { label: "Lost", className: "bg-red-100 text-red-700" },
};

const DISPOSITION_LABELS: Record<string, string> = {
  qualified: "Qualified",
  "meeting-booked": "Meeting Booked",
  connected: "Connected",
  "callback-scheduled": "Callback Scheduled",
  "not-interested": "Not Interested",
  "no-answer": "No Answer",
  voicemail: "Voicemail",
  "wrong-number": "Wrong Number",
};

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value) return null;

  const content = (
    <div className="flex items-start gap-2 py-1.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
      {href && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:bg-muted/50 rounded px-2 -mx-2 transition-colors"
      >
        {content}
      </a>
    );
  }

  return content;
}

function IntelSection({
  title,
  icon,
  content,
}: {
  title: string;
  icon: React.ReactNode;
  content: string | null | undefined;
}) {
  if (!content) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h4>
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

export function LeadDetailModal({
  open,
  onOpenChange,
  lead,
  onCall,
}: LeadDetailModalProps) {
  const [, navigate] = useLocation();

  const { data: details, isLoading } = useQuery<LeadDetails>({
    queryKey: ["/api/leads", lead?.id, "details"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${lead?.id}/details`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch lead details");
      return res.json();
    },
    enabled: open && !!lead?.id,
  });

  if (!lead) return null;

  const statusConfig = STATUS_CONFIG[lead.status] || {
    label: lead.status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {lead.companyName}
                  {lead.fitScore !== null && lead.fitScore !== undefined && (
                    <Badge
                      variant="secondary"
                      className={`ml-2 ${
                        lead.fitScore >= 70
                          ? "bg-green-100 text-green-700"
                          : lead.fitScore >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      Fit: {lead.fitScore}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {lead.contactName}
                  </span>
                  {lead.contactTitle && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span>{lead.contactTitle}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="intel">Intel</TabsTrigger>
                <TabsTrigger value="calls">Call History</TabsTrigger>
                <TabsTrigger value="qualification">BANT</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Info */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1">
                      <InfoRow
                        icon={<Mail className="h-3.5 w-3.5" />}
                        label="Email"
                        value={lead.contactEmail}
                        href={lead.contactEmail ? `mailto:${lead.contactEmail}` : undefined}
                      />
                      <InfoRow
                        icon={<Phone className="h-3.5 w-3.5" />}
                        label="Phone"
                        value={lead.contactPhone}
                        href={lead.contactPhone ? `tel:${lead.contactPhone}` : undefined}
                      />
                      <InfoRow
                        icon={<Linkedin className="h-3.5 w-3.5" />}
                        label="LinkedIn"
                        value={lead.contactLinkedIn ? "View Profile" : null}
                        href={lead.contactLinkedIn || undefined}
                      />
                    </CardContent>
                  </Card>

                  {/* Company Info */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Company Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1">
                      <InfoRow
                        icon={<Globe className="h-3.5 w-3.5" />}
                        label="Website"
                        value={lead.companyWebsite ? new URL(lead.companyWebsite).hostname : null}
                        href={lead.companyWebsite || undefined}
                      />
                      <InfoRow
                        icon={<Briefcase className="h-3.5 w-3.5" />}
                        label="Industry"
                        value={lead.companyIndustry}
                      />
                      <InfoRow
                        icon={<Users className="h-3.5 w-3.5" />}
                        label="Company Size"
                        value={lead.companySize}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Key Dates & Assignment */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {lead.nextFollowUpAt && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Follow-up
                      </div>
                      <p className="font-medium text-sm">
                        {format(new Date(lead.nextFollowUpAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                  {lead.lastContactedAt && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-600 text-xs mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        Last Contact
                      </div>
                      <p className="font-medium text-sm">
                        {formatDistanceToNow(new Date(lead.lastContactedAt), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                  {details?.assignedSdr && (
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-purple-600 text-xs mb-1">
                        <User className="h-3.5 w-3.5" />
                        Assigned To
                      </div>
                      <p className="font-medium text-sm">{details.assignedSdr.name}</p>
                    </div>
                  )}
                  {lead.source && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                        <Zap className="h-3.5 w-3.5" />
                        Source
                      </div>
                      <p className="font-medium text-sm capitalize">{lead.source}</p>
                    </div>
                  )}
                </div>

                {/* Priority & Buy Signals */}
                {(lead.priority || lead.buySignals) && (
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      {lead.priority && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={
                              lead.priority === "hot"
                                ? "bg-red-100 text-red-700"
                                : lead.priority === "warm"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                            }
                          >
                            {lead.priority.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Priority</span>
                        </div>
                      )}
                      {lead.buySignals && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Buy Signals
                          </p>
                          <p className="text-sm">{lead.buySignals}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="intel" className="space-y-4 mt-4">
                {details?.research ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge
                        variant="outline"
                        className={
                          details.research.confidence === "high"
                            ? "border-green-500 text-green-700"
                            : details.research.confidence === "medium"
                              ? "border-amber-500 text-amber-700"
                              : "border-red-500 text-red-700"
                        }
                      >
                        {details.research.confidence?.toUpperCase() || "UNKNOWN"} Confidence
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(details.research.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <IntelSection
                      title="Company Intelligence"
                      icon={<Building2 className="h-4 w-4" />}
                      content={details.research.companyIntel}
                    />
                    <IntelSection
                      title="Contact Intelligence"
                      icon={<User className="h-4 w-4" />}
                      content={details.research.contactIntel}
                    />
                    <IntelSection
                      title="Pain Signals"
                      icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                      content={details.research.painSignals}
                    />
                    <IntelSection
                      title="Suggested Talk Track"
                      icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
                      content={details.research.talkTrack}
                    />
                    <IntelSection
                      title="Discovery Questions"
                      icon={<Lightbulb className="h-4 w-4 text-yellow-500" />}
                      content={details.research.discoveryQuestions}
                    />
                    <IntelSection
                      title="Objection Handling"
                      icon={<FileText className="h-4 w-4 text-purple-500" />}
                      content={details.research.objectionHandles}
                    />
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No research available</p>
                    <p className="text-sm mt-1">Research this lead to get AI-powered intelligence</p>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/leads?research=${lead.id}`);
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Start Research
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calls" className="mt-4">
                {details?.callHistory && details.callHistory.length > 0 ? (
                  <div className="space-y-3">
                    {details.callHistory.map((call) => (
                      <Card key={call.id}>
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  call.disposition === "qualified" ||
                                  call.disposition === "meeting-booked"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <PhoneCall className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {call.disposition
                                      ? DISPOSITION_LABELS[call.disposition] || call.disposition
                                      : "Unknown"}
                                  </Badge>
                                  {call.duration && (
                                    <span className="text-xs text-muted-foreground">
                                      {Math.floor(call.duration / 60)}m {call.duration % 60}s
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(call.startedAt), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                            </div>
                          </div>

                          {(call.keyTakeaways || call.nextSteps || call.sdrNotes) && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              {call.keyTakeaways && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Key Takeaways
                                  </p>
                                  <p className="text-sm">{call.keyTakeaways}</p>
                                </div>
                              )}
                              {call.nextSteps && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Next Steps
                                  </p>
                                  <p className="text-sm">{call.nextSteps}</p>
                                </div>
                              )}
                              {call.sdrNotes && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                                  <p className="text-sm">{call.sdrNotes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No call history</p>
                    <p className="text-sm mt-1">Make a call to start building the relationship</p>
                    {lead.contactPhone && onCall && (
                      <Button
                        className="mt-4"
                        onClick={() => {
                          onOpenChange(false);
                          onCall(lead);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Now
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="qualification" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Budget */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        Budget
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {lead.budget ? (
                        <p className="text-sm">{lead.budget}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not yet discovered</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Authority */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        Decision Makers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {lead.decisionMakers ? (
                        <p className="text-sm">{lead.decisionMakers}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not yet discovered</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Need */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        Needs & Pain Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {details?.research?.painSignals ? (
                        <p className="text-sm">{details.research.painSignals}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not yet discovered</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {lead.timeline ? (
                        <p className="text-sm">{lead.timeline}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Not yet discovered</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Qualification Notes */}
                {lead.qualificationNotes && (
                  <Card className="mt-4">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Qualification Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm whitespace-pre-wrap">{lead.qualificationNotes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        )}

        <div className="flex justify-between gap-2 pt-4 border-t shrink-0">
          <div className="flex gap-2">
            {lead.contactPhone && onCall && (
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onCall(lead);
                }}
                className="bg-hawk-blue hover:bg-hawk-blue-600"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Now
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                navigate(`/call-prep/${lead.id}`);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Full Brief
            </Button>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
