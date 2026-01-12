import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ZoomPhoneEmbed, type ZoomCallEvent, type ZoomRecordingEvent, type ZoomAISummaryEvent } from "@/components/zoom-phone-embed";
import { CallBrief } from "@/components/call-brief";
import { PostCallSummaryForm, type CallOutcomeData } from "@/components/post-call-summary-form";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import {
  Phone,
  Clock,
  History,
  ChevronDown,
  FileText,
  Play,
  Sparkles,
  Loader2,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Mail,
  Search,
  User,
  Building2,
  PhoneCall
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { AccountExecutive } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CallSession, Lead, ResearchPacket, ManagerCallAnalysis } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CoachingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchString);
  const leadIdParam = params.get("leadId");
  const phoneParam = params.get("phone");

  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
  const [pendingOutcomeCallId, setPendingOutcomeCallId] = useState<string | null>(null);
  const [selectedAeId, setSelectedAeId] = useState<string>("");
  const [showAeSelector, setShowAeSelector] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadIdParam);

  const { data: accountExecutives = [] } = useQuery<AccountExecutive[]>({
    queryKey: ["/api/account-executives"],
    enabled: showAeSelector,
  });

  // Fetch all leads for the selector
  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Fetch selected lead details
  const { data: leadDetail } = useQuery<{ lead: Lead; researchPacket: ResearchPacket | null }>({
    queryKey: ["/api/leads", selectedLeadId],
    enabled: !!selectedLeadId,
  });

  const { data: callHistory = [], isLoading: historyLoading } = useQuery<CallSession[]>({
    queryKey: ["/api/call-sessions"],
  });

  // Filter leads based on search
  const filteredLeads = allLeads.filter(lead => {
    if (!leadSearchQuery) return true;
    const query = leadSearchQuery.toLowerCase();
    return (
      lead.companyName?.toLowerCase().includes(query) ||
      lead.contactName?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.phone?.includes(query)
    );
  }).slice(0, 10); // Limit to 10 results

  const [internalSessionId, setInternalSessionId] = useState<string | null>(null);
  const [zoomCallMetadata, setZoomCallMetadata] = useState<{ direction: string; toNumber?: string; fromNumber?: string } | null>(null);

  const handleZoomCallStart = async (event: ZoomCallEvent) => {
    const phoneNumber = event.data.direction === "outbound"
      ? event.data.callee.phoneNumber
      : event.data.caller.phoneNumber;
    setCurrentPhoneNumber(phoneNumber || null);
    setCurrentCallSid(event.data.callId);
    setCallStartTime(new Date());

    setZoomCallMetadata({
      direction: event.data.direction,
      toNumber: event.data.callee.phoneNumber,
      fromNumber: event.data.caller.phoneNumber,
    });

    try {
      const response = await apiRequest("POST", "/api/call-sessions/zoom", {
        zoomCallId: event.data.callId,
        direction: event.data.direction,
        toNumber: event.data.callee.phoneNumber,
        fromNumber: event.data.caller.phoneNumber,
        leadId: selectedLeadId || null,
      });
      const data = await response.json();
      setInternalSessionId(data.sessionId);
      console.log("[CallCenter] Created session:", data.sessionId, "for Zoom call:", event.data.callId);
    } catch (error) {
      console.error("[CallCenter] Failed to create call session (will retry on end):", error);
    }
  };

  const handleZoomCallConnected = async (event: ZoomCallEvent) => {
    console.log("[CallCenter] Call connected:", event.data.callId);
    try {
      await apiRequest("PATCH", `/api/call-sessions/zoom/${event.data.callId}`, {
        status: "in-progress",
      });
    } catch (error) {
      console.error("[CallCenter] Failed to update call status:", error);
    }
  };

  const handleZoomCallEnd = async (event: ZoomCallEvent) => {
    let sessionId = internalSessionId;
    const zoomCallId = event.data.callId;
    const savedStartTime = callStartTime;

    setCurrentPhoneNumber(null);
    setCurrentCallSid(null);
    setCallStartTime(null);

    try {
      const duration = event.data.duration || Math.floor((Date.now() - (savedStartTime?.getTime() || Date.now())) / 1000);
      const response = await apiRequest("PATCH", `/api/call-sessions/zoom/${zoomCallId}`, {
        status: "completed",
        duration,
        direction: zoomCallMetadata?.direction,
        toNumber: zoomCallMetadata?.toNumber,
        fromNumber: zoomCallMetadata?.fromNumber,
        leadId: selectedLeadId || null,
      });
      if (response.ok) {
        const session = await response.json();
        sessionId = session.id;
        console.log("[CallCenter] Call ended, session:", sessionId);
      }
    } catch (error) {
      console.error("[CallCenter] Failed to update call end:", error);
    }

    if (!sessionId && zoomCallId) {
      try {
        const response = await apiRequest("GET", `/api/call-sessions/by-zoom-id/${zoomCallId}`);
        if (response.ok) {
          const session = await response.json();
          sessionId = session.id;
          console.log("[CallCenter] Recovered session ID:", sessionId);
        }
      } catch (error) {
        console.error("[CallCenter] Failed to recover session:", error);
      }
    }

    if (sessionId) {
      setPendingOutcomeCallId(sessionId);
    } else {
      toast({
        title: "Call Logged",
        description: "Call completed but session could not be saved. Please try again.",
        variant: "destructive",
      });
    }
    setInternalSessionId(null);
    setZoomCallMetadata(null);

    // Refresh call history
    queryClient.invalidateQueries({ queryKey: ["/api/call-sessions"] });
  };

  const handleZoomRecordingComplete = async (event: ZoomRecordingEvent) => {
    console.log("[CallCenter] Recording completed:", event.data.recordingId);
    try {
      await apiRequest("PATCH", `/api/call-sessions/zoom/${event.data.callId}`, {
        recordingUrl: event.data.downloadUrl,
      });

      console.log("[CallCenter] Triggering automatic analysis...");
      toast({
        title: "Analyzing Call",
        description: "Running AI coaching analysis on your recording...",
      });

      const analysisResponse = await apiRequest("POST", `/api/call-sessions/zoom/${event.data.callId}/auto-analyze`, {});
      if (analysisResponse.ok) {
        const result = await analysisResponse.json();
        if (result.status === "completed") {
          toast({
            title: "Analysis Complete",
            description: `Call scored ${result.analysis?.score || "N/A"}/100. View details in call history.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/call-sessions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/coach/performance-summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/manager/oversight"] });
        } else if (result.status === "pending") {
          toast({
            title: "Analysis Pending",
            description: "Recording is still processing. Analysis will run shortly.",
          });
        }
      }
    } catch (error) {
      console.error("[CallCenter] Failed to save recording URL or analyze:", error);
      toast({
        title: "Analysis Issue",
        description: "Recording saved but analysis may be delayed.",
        variant: "destructive",
      });
    }
  };

  const handleZoomAISummary = async (event: ZoomAISummaryEvent) => {
    console.log("[CallCenter] Zoom AI Summary:", event.data.summary);
    try {
      await apiRequest("PATCH", `/api/call-sessions/zoom/${event.data.callId}`, {
        zoomAiSummary: event.data.summary,
      });
    } catch (error) {
      console.error("[CallCenter] Failed to save AI summary:", error);
    }
  };

  const saveOutcomeMutation = useMutation({
    mutationFn: async ({ callId, data }: { callId: string; data: CallOutcomeData }) => {
      const res = await apiRequest("PATCH", `/api/call-sessions/${callId}/outcome`, data);
      return res.json();
    },
    onSuccess: () => {
      setPendingOutcomeCallId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/call-sessions"] });
      if (selectedLeadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLeadId, "calls"] });
      }
      toast({ title: "Summary saved", description: "Call outcome logged successfully" });
    },
    onError: () => {
      toast({ title: "Save failed", description: "Could not save call summary", variant: "destructive" });
    },
  });

  const [analysisResult, setAnalysisResult] = useState<{ managerSummary: string[]; coachingMessage: string } | null>(null);
  const [managerAnalysis, setManagerAnalysis] = useState<ManagerCallAnalysis | null>(null);
  const [loadingExistingAnalysis, setLoadingExistingAnalysis] = useState(false);

  useEffect(() => {
    if (selectedCall && (user?.role === "admin" || user?.role === "manager")) {
      setLoadingExistingAnalysis(true);
      fetch(`/api/call-sessions/${selectedCall.id}/manager-analysis`, { credentials: "include" })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setManagerAnalysis(data);
        })
        .catch(() => {})
        .finally(() => setLoadingExistingAnalysis(false));
    }
  }, [selectedCall, user?.role]);

  const managerAnalysisMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/call-sessions/${sessionId}/manager-analysis`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setManagerAnalysis(data);
      toast({ title: "Manager Analysis Complete", description: "Detailed performance scorecard generated" });
    },
    onError: () => {
      toast({ title: "Analysis Failed", description: "Could not generate manager analysis", variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/coach/analyze/${sessionId}`, {
        sdrFirstName: user?.name?.split(" ")[0] || "there",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/call-sessions"] });
      toast({ title: "Analysis complete", description: "Your call has been analyzed by the AI coach" });
    },
    onError: () => {
      toast({ title: "Analysis failed", description: "Could not analyze this call", variant: "destructive" });
    },
  });

  const [recordingAnalysis, setRecordingAnalysis] = useState<{
    transcript: string;
    analysis: {
      overallScore: number;
      callSummary: string;
      strengths: string[];
      areasForImprovement: string[];
      recommendedActions: string[];
    };
  } | null>(null);

  const analyzeRecordingMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/call-sessions/${sessionId}/analyze-recording`, {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Analysis failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setRecordingAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["/api/call-sessions"] });
      toast({ title: "Recording analyzed", description: `Call score: ${data.analysis?.overallScore || "N/A"}/100` });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const sendToAeMutation = useMutation({
    mutationFn: async ({ sessionId, aeId, leadId }: { sessionId: string; aeId: string; leadId?: string }) => {
      const res = await apiRequest("POST", `/api/call-sessions/${sessionId}/send-to-ae`, { aeId, leadId });
      if (!res.ok) throw new Error("Failed to send to AE");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sent to Account Executive", description: "The handoff email has been sent successfully" });
      setShowAeSelector(false);
      setSelectedAeId("");
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => {
      toast({ title: "Send failed", description: "Could not send handoff email", variant: "destructive" });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/coach/resend-email/${sessionId}`, {});
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Email Sent", description: data.message || "Coaching email sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Email Failed", description: error.message, variant: "destructive" });
    },
  });

  // Handle lead selection
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    setLeadSearchQuery("");
    // Update URL without navigation
    const lead = allLeads.find(l => l.id === leadId);
    if (lead?.phone) {
      setLocation(`/coaching?leadId=${leadId}&phone=${encodeURIComponent(lead.phone)}`, { replace: true });
    } else {
      setLocation(`/coaching?leadId=${leadId}`, { replace: true });
    }
  };

  const clearLeadSelection = () => {
    setSelectedLeadId(null);
    setLocation("/coaching", { replace: true });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Call Center</h1>
        <p className="text-muted-foreground">
          Select a lead, make calls, and log outcomes.
        </p>
      </div>

      {/* Lead Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, company, email, or phone..."
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-lead-search"
              />
              {leadSearchQuery && filteredLeads.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-[300px] overflow-auto">
                  <CardContent className="p-2">
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors flex items-center gap-3"
                        onClick={() => handleLeadSelect(lead.id)}
                        data-testid={`lead-option-${lead.id}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{lead.contactName}</p>
                          <p className="text-sm text-muted-foreground truncate">{lead.companyName}</p>
                        </div>
                        {lead.phone && (
                          <Badge variant="outline" className="flex-shrink-0">
                            <Phone className="h-3 w-3 mr-1" />
                            {lead.phone}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
            {selectedLeadId && leadDetail && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">{leadDetail.lead.contactName}</span>
                <span className="text-muted-foreground">at</span>
                <span>{leadDetail.lead.companyName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLeadSelection}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Phone & Call Brief */}
        <div className="lg:col-span-1 space-y-4">
          <ZoomPhoneEmbed
            onCallStart={handleZoomCallStart}
            onCallConnected={handleZoomCallConnected}
            onCallEnd={handleZoomCallEnd}
            onRecordingComplete={handleZoomRecordingComplete}
            onAISummary={handleZoomAISummary}
            initialPhoneNumber={phoneParam || leadDetail?.lead?.phone || undefined}
            leadId={selectedLeadId || undefined}
          />

          {/* Post-Call Summary Form */}
          {pendingOutcomeCallId && (
            <PostCallSummaryForm
              callSessionId={pendingOutcomeCallId}
              onSubmit={async (data) => {
                await saveOutcomeMutation.mutateAsync({ callId: pendingOutcomeCallId, data });
              }}
              onCancel={() => setPendingOutcomeCallId(null)}
              isSubmitting={saveOutcomeMutation.isPending}
            />
          )}

          {/* Call Brief - Shows when lead is selected */}
          {leadDetail && (
            <CallBrief
              lead={leadDetail.lead}
              researchPacket={leadDetail.researchPacket}
              isOnCall={!!currentPhoneNumber}
            />
          )}
        </div>

        {/* Right Column - Call History */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Calls
                  </CardTitle>
                  <CardDescription>
                    Click a call to view details, analyze, or send to AE
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  {callHistory.length} calls
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {historyLoading ? (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : callHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Phone className="h-12 w-12 mb-3 opacity-30" />
                    <p className="font-medium">No calls yet</p>
                    <p className="text-sm">Select a lead and make your first call</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {callHistory.slice(0, 20).map((call) => (
                      <div
                        key={call.id}
                        className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedCall(call)}
                        data-testid={`call-history-item-${call.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              call.disposition === "qualified" || call.disposition === "meeting-booked"
                                ? "bg-green-100 text-green-600"
                                : call.disposition === "no-answer" || call.disposition === "not-interested"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-muted text-muted-foreground"
                            }`}>
                              <PhoneCall className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {call.toNumber || call.fromNumber || "Unknown"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {call.startedAt ? new Date(call.startedAt).toLocaleString() : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {call.duration && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, "0")}
                              </Badge>
                            )}
                            <Badge variant={
                              call.status === "completed" ? "secondary" :
                              call.status === "in-progress" ? "default" : "outline"
                            }>
                              {call.disposition || call.status}
                            </Badge>
                            {(call.transcriptText || call.coachingNotes) && (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analyzed
                              </Badge>
                            )}
                          </div>
                        </div>
                        {call.keyTakeaways && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {call.keyTakeaways}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call Details Modal */}
      <Dialog open={!!selectedCall} onOpenChange={(open) => {
        if (!open) {
          setSelectedCall(null);
          setAnalysisResult(null);
          setManagerAnalysis(null);
          setRecordingAnalysis(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call Details
            </DialogTitle>
            <DialogDescription>
              {selectedCall?.toNumber || selectedCall?.fromNumber || "Unknown"} - {selectedCall?.startedAt ? new Date(selectedCall.startedAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={selectedCall?.status === "completed" ? "secondary" : "outline"}>
                {selectedCall?.disposition || selectedCall?.status}
              </Badge>
              {selectedCall?.recordingUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const match = selectedCall.recordingUrl!.match(/Recordings\/([A-Za-z0-9]+)/);
                    if (match) {
                      window.open(`/api/voice/recording/${match[1]}`, "_blank");
                    }
                  }}
                  data-testid="button-play-recording"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Play Recording
                </Button>
              )}
              {selectedCall?.status === "completed" && (selectedCall?.transcriptText || selectedCall?.recordingUrl || selectedCall?.callSid?.startsWith("zoom_")) && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (selectedCall.id) {
                        if (selectedCall.transcriptText) {
                          analyzeMutation.mutate(selectedCall.id);
                        } else {
                          analyzeRecordingMutation.mutate(selectedCall.id);
                        }
                      }
                    }}
                    disabled={analyzeMutation.isPending || analyzeRecordingMutation.isPending}
                    data-testid="button-analyze-call"
                  >
                    {analyzeMutation.isPending || analyzeRecordingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    {selectedCall?.transcriptText ? "Analyze Call" : "Get Transcript & Analyze"}
                  </Button>
                  {(user?.role === "admin" || user?.role === "manager") && !managerAnalysis && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => selectedCall.id && managerAnalysisMutation.mutate(selectedCall.id)}
                      disabled={managerAnalysisMutation.isPending || loadingExistingAnalysis}
                      data-testid="button-manager-analysis"
                    >
                      {managerAnalysisMutation.isPending || loadingExistingAnalysis ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <BarChart3 className="h-4 w-4 mr-1" />
                      )}
                      Manager Scorecard
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAeSelector(!showAeSelector)}
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                    data-testid="button-send-to-ae"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send to AE
                  </Button>
                  {selectedCall?.coachingNotes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedCall.id && resendEmailMutation.mutate(selectedCall.id)}
                      disabled={resendEmailMutation.isPending}
                      data-testid="button-resend-email"
                    >
                      {resendEmailMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4 mr-1" />
                      )}
                      Send Coaching Email
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* AE Selector */}
            {showAeSelector && selectedCall && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Select value={selectedAeId} onValueChange={setSelectedAeId}>
                  <SelectTrigger className="w-[220px]" data-testid="select-ae">
                    <SelectValue placeholder="Select Account Executive" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountExecutives.map((ae) => (
                      <SelectItem key={ae.id} value={ae.id}>
                        {ae.name} ({ae.region})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!selectedAeId || sendToAeMutation.isPending}
                  onClick={() => {
                    if (selectedCall.id && selectedAeId) {
                      sendToAeMutation.mutate({
                        sessionId: selectedCall.id,
                        aeId: selectedAeId,
                        leadId: selectedCall.leadId || undefined,
                      });
                    }
                  }}
                  data-testid="button-confirm-send-ae"
                >
                  {sendToAeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Handoff"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAeSelector(false);
                    setSelectedAeId("");
                  }}
                  data-testid="button-cancel-send-ae"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Manager Analysis Scorecard */}
            {managerAnalysis && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-md border border-purple-200 dark:border-purple-800">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-900 dark:text-purple-100">
                    <BarChart3 className="h-5 w-5" />
                    Manager Performance Scorecard
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-3 bg-white/50 dark:bg-black/20 rounded-md">
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{managerAnalysis.overallScore}</p>
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                    </div>
                    {[
                      { label: "Opening", score: managerAnalysis.openingScore },
                      { label: "Discovery", score: managerAnalysis.discoveryScore },
                      { label: "Listening", score: managerAnalysis.listeningScore },
                    ].map(({ label, score }) => (
                      <div key={label} className="text-center p-2 bg-white/50 dark:bg-black/20 rounded-md">
                        <p className="text-xl font-semibold">{score}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Objection Handling", score: managerAnalysis.objectionScore },
                      { label: "Value Prop", score: managerAnalysis.valuePropositionScore },
                      { label: "Closing", score: managerAnalysis.closingScore },
                      { label: "Compliance", score: managerAnalysis.complianceScore },
                    ].map(({ label, score }) => (
                      <div key={label} className="text-center p-2 bg-white/50 dark:bg-black/20 rounded-md">
                        <p className="text-xl font-semibold">{score}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Tabs defaultValue="observations" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="observations" data-testid="tab-observations">Observations</TabsTrigger>
                    <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
                    <TabsTrigger value="criteria" data-testid="tab-criteria">Criteria Met</TabsTrigger>
                  </TabsList>

                  <TabsContent value="observations" className="mt-3">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-2">
                        {(() => {
                          try {
                            const obs = JSON.parse(managerAnalysis.keyObservations || "[]");
                            return obs.map((item: { category?: string; observation?: string; quote?: string }, i: number) => (
                              <div key={i} className="p-3 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">{item.category || "General"}</Badge>
                                </div>
                                <p className="text-sm">{item.observation}</p>
                                {item.quote && (
                                  <p className="text-xs text-muted-foreground italic mt-1">"{item.quote}"</p>
                                )}
                              </div>
                            ));
                          } catch {
                            return <p className="text-sm text-muted-foreground">{managerAnalysis.keyObservations}</p>;
                          }
                        })()}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="recommendations" className="mt-3">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-2">
                        {(() => {
                          try {
                            const recs = JSON.parse(managerAnalysis.recommendations || "[]");
                            return recs.map((item: { priority?: string; recommendation?: string; action?: string }, i: number) => (
                              <div key={i} className="p-3 bg-muted/50 rounded-md">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={item.priority === "high" ? "destructive" : item.priority === "medium" ? "secondary" : "outline"}
                                    className="text-xs"
                                  >
                                    {item.priority || "normal"}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium">{item.recommendation}</p>
                                {item.action && (
                                  <p className="text-xs text-muted-foreground mt-1">Action: {item.action}</p>
                                )}
                              </div>
                            ));
                          } catch {
                            return <p className="text-sm text-muted-foreground">{managerAnalysis.recommendations}</p>;
                          }
                        })()}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="criteria" className="mt-3">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2 pr-2">
                        {(() => {
                          try {
                            const criteria = JSON.parse(managerAnalysis.criteriaComparison || "[]");
                            return criteria.map((item: { criterion?: string; status?: string; notes?: string }, i: number) => (
                              <div key={i} className="p-3 bg-muted/50 rounded-md flex items-start gap-3">
                                {item.status === "met" || item.status === "exceeded" ? (
                                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : item.status === "missed" ? (
                                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{item.criterion}</p>
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                                  )}
                                </div>
                              </div>
                            ));
                          } catch {
                            return <p className="text-sm text-muted-foreground">{managerAnalysis.criteriaComparison}</p>;
                          }
                        })()}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Recording Analysis */}
            {recordingAnalysis && (
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Call Analysis
                  </h4>
                  <Badge className={recordingAnalysis.analysis.overallScore >= 70 ? "bg-green-500" : recordingAnalysis.analysis.overallScore >= 50 ? "bg-yellow-500" : "bg-red-500"}>
                    Score: {recordingAnalysis.analysis.overallScore}/100
                  </Badge>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">{recordingAnalysis.analysis.callSummary}</p>
                {recordingAnalysis.analysis.strengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Strengths:</p>
                    <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                      {recordingAnalysis.analysis.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {recordingAnalysis.analysis.areasForImprovement?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Areas for Improvement:</p>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      {recordingAnalysis.analysis.areasForImprovement.slice(0, 3).map((a, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Coaching Notes Indicator */}
            {selectedCall?.coachingNotes && !recordingAnalysis && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  This call has been analyzed. View your performance in the "My Performance" page.
                </p>
              </div>
            )}

            {/* Transcript */}
            {(selectedCall?.transcriptText || recordingAnalysis?.transcript) ? (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transcript
                </h4>
                <ScrollArea className="h-[200px] border rounded-md p-3">
                  <div className="space-y-2 text-sm whitespace-pre-wrap">
                    {selectedCall?.transcriptText || recordingAnalysis?.transcript}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No transcript available</p>
                {selectedCall?.status === "completed" && (selectedCall?.recordingUrl || selectedCall?.callSid?.startsWith("zoom_")) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => selectedCall.id && analyzeRecordingMutation.mutate(selectedCall.id)}
                    disabled={analyzeRecordingMutation.isPending}
                  >
                    {analyzeRecordingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Get Transcript
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
