import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ZoomPhoneEmbed, type ZoomCallEvent, type ZoomRecordingEvent, type ZoomAISummaryEvent } from "@/components/zoom-phone-embed";
import { CallBrief } from "@/components/call-brief";
import { PostCallSummaryForm, type CallOutcomeData } from "@/components/post-call-summary-form";
import { BudgetingPanel } from "@/components/budgeting-panel";
import { useTranscription } from "@/hooks/use-transcription";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Phone, MessageSquare, Clock, Activity, Lightbulb, Wifi, WifiOff, History, ChevronDown, FileText, Play, User, Building2, Target, HelpCircle, Sparkles, Loader2, Calculator, BarChart3, CheckCircle, XCircle, AlertCircle, TrendingUp, Send, Trophy, Zap, Award, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccountExecutive } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CallSession, Lead, ResearchPacket, ManagerCallAnalysis } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PerformanceSummary {
  stats: {
    callsLast7Days: number;
    completedCallsLast7Days: number;
    talkTimeMinutes: number;
    analyzedCalls: number;
  };
  latestCoaching: {
    id: string;
    callDate: string;
    toNumber: string;
    duration: number | null;
    coachingNotes: string;
    disposition: string | null;
  } | null;
  winHighlight: { text: string; callDate: string } | null;
  focusArea: { skill: string; suggestion: string } | null;
  weeklyTrend: { week: string; calls: number; talkTime: number }[];
  recentCalls: {
    id: string;
    callDate: string;
    toNumber: string;
    duration: number | null;
    coachingNotes: string;
    disposition: string | null;
  }[];
}

export default function CoachingPage() {
  const { user } = useAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const leadIdParam = params.get("leadId");
  const phoneParam = params.get("phone");
  
  const [activeTab, setActiveTab] = useState<string>("live");
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [talkTime, setTalkTime] = useState("0:00");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
  const [callPrepOpen, setCallPrepOpen] = useState(!!leadIdParam);
  const [pendingOutcomeCallId, setPendingOutcomeCallId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [budgetingOpen, setBudgetingOpen] = useState(false);
  const [selectedAeId, setSelectedAeId] = useState<string>("");
  const [showAeSelector, setShowAeSelector] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { data: accountExecutives = [] } = useQuery<AccountExecutive[]>({
    queryKey: ["/api/account-executives"],
    enabled: showAeSelector,
  });

  const { data: leadDetail } = useQuery<{ lead: Lead; researchPacket: ResearchPacket | null }>({
    queryKey: ["/api/leads", leadIdParam],
    enabled: !!leadIdParam,
  });

  const { data: callHistory = [], isLoading: historyLoading } = useQuery<CallSession[]>({
    queryKey: ["/api/call-sessions"],
    enabled: historyOpen,
  });

  const { data: performanceSummary, isLoading: performanceLoading } = useQuery<PerformanceSummary>({
    queryKey: ["/api/coach/performance-summary"],
    enabled: activeTab === "performance",
    refetchOnWindowFocus: false,
  });

  const {
    transcripts,
    coachingTips,
    livePartial,
    isConnected,
    clearTranscripts,
  } = useTranscription(user?.id, currentCallSid);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts, livePartial]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (callStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setTalkTime(`${mins}:${secs.toString().padStart(2, "0")}`);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStartTime]);

  const [internalSessionId, setInternalSessionId] = useState<string | null>(null);

  const [zoomCallMetadata, setZoomCallMetadata] = useState<{ direction: string; toNumber?: string; fromNumber?: string } | null>(null);

  const handleZoomCallStart = async (event: ZoomCallEvent) => {
    const phoneNumber = event.data.direction === "outbound" 
      ? event.data.callee.phoneNumber 
      : event.data.caller.phoneNumber;
    setCurrentPhoneNumber(phoneNumber || null);
    setCurrentCallSid(event.data.callId);
    setCallStartTime(new Date());
    clearTranscripts();

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
        leadId: leadIdParam || null,
      });
      const data = await response.json();
      setInternalSessionId(data.sessionId);
      console.log("[Coaching] Created session:", data.sessionId, "for Zoom call:", event.data.callId);
    } catch (error) {
      console.error("[Coaching] Failed to create call session (will retry on end):", error);
    }
  };

  const handleZoomCallConnected = async (event: ZoomCallEvent) => {
    console.log("[Coaching] Call connected:", event.data.callId);
    try {
      await apiRequest("PATCH", `/api/call-sessions/zoom/${event.data.callId}`, {
        status: "in-progress",
      });
    } catch (error) {
      console.error("[Coaching] Failed to update call status:", error);
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
        leadId: leadIdParam || null,
      });
      if (response.ok) {
        const session = await response.json();
        sessionId = session.id;
        console.log("[Coaching] Call ended, session:", sessionId);
      }
    } catch (error) {
      console.error("[Coaching] Failed to update call end:", error);
    }

    if (!sessionId && zoomCallId) {
      try {
        const response = await apiRequest("GET", `/api/call-sessions/by-zoom-id/${zoomCallId}`);
        if (response.ok) {
          const session = await response.json();
          sessionId = session.id;
          console.log("[Coaching] Recovered session ID:", sessionId);
        }
      } catch (error) {
        console.error("[Coaching] Failed to recover session:", error);
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
  };

  const handleZoomRecordingComplete = async (event: ZoomRecordingEvent) => {
    console.log("[Coaching] Recording completed:", event.data.recordingId);
    try {
      await apiRequest("PATCH", `/api/call-sessions/zoom/${event.data.callId}`, {
        recordingUrl: event.data.downloadUrl,
      });
      
      console.log("[Coaching] Triggering automatic analysis...");
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
            description: `Call scored ${result.analysis?.score || "N/A"}/100. Check your performance tab!`,
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
      console.error("[Coaching] Failed to save recording URL or analyze:", error);
      toast({
        title: "Analysis Issue",
        description: "Recording saved but analysis may be delayed.",
        variant: "destructive",
      });
    }
  };

  const handleZoomAISummary = async (event: ZoomAISummaryEvent) => {
    console.log("[Coaching] Zoom AI Summary:", event.data.summary);
    try {
      await apiRequest("PATCH", `/api/call-sessions/zoom/${event.data.callId}`, {
        zoomAiSummary: event.data.summary,
      });
    } catch (error) {
      console.error("[Coaching] Failed to save AI summary:", error);
    }
  };

  const { toast } = useToast();

  const saveOutcomeMutation = useMutation({
    mutationFn: async ({ callId, data }: { callId: string; data: CallOutcomeData }) => {
      const res = await apiRequest("PATCH", `/api/call-sessions/${callId}/outcome`, data);
      return res.json();
    },
    onSuccess: () => {
      setPendingOutcomeCallId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/call-sessions"] });
      if (leadIdParam) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", leadIdParam, "calls"] });
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Coaching Center</h1>
          <p className="text-muted-foreground">
            Make calls, get AI coaching, and track your performance.
          </p>
        </div>
        <Badge 
          variant={isConnected ? "secondary" : "outline"} 
          className="flex items-center gap-1"
          data-testid="badge-connection-status"
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Connecting...
            </>
          )}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="live" className="flex items-center gap-2" data-testid="tab-live-coaching">
            <Phone className="h-4 w-4" />
            Live Coaching
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2" data-testid="tab-my-performance">
            <TrendingUp className="h-4 w-4" />
            My Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <ZoomPhoneEmbed 
            onCallStart={handleZoomCallStart}
            onCallConnected={handleZoomCallConnected}
            onCallEnd={handleZoomCallEnd}
            onRecordingComplete={handleZoomRecordingComplete}
            onAISummary={handleZoomAISummary}
            initialPhoneNumber={phoneParam || undefined}
            leadId={leadIdParam || undefined}
          />
          
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between"
                data-testid="button-toggle-history"
              >
                <span className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Call History
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Card>
                <CardContent className="pt-4">
                  <ScrollArea className="h-[200px]">
                    {historyLoading ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Loading...
                      </div>
                    ) : callHistory.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No calls yet
                      </div>
                    ) : (
                      <div className="space-y-2 pr-2">
                        {callHistory.slice(0, 10).map((call) => (
                          <div
                            key={call.id}
                            className="p-2 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                            onClick={() => setSelectedCall(call)}
                            data-testid={`call-history-item-${call.id}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium truncate">
                                {call.toNumber || call.fromNumber || "Unknown"}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {call.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {call.startedAt ? new Date(call.startedAt).toLocaleDateString() : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={budgetingOpen} onOpenChange={setBudgetingOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
                data-testid="button-toggle-budgeting"
              >
                <span className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Quick Budgeting
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${budgetingOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <BudgetingPanel />
            </CollapsibleContent>
          </Collapsible>

          {leadDetail && (
            <CallBrief 
              lead={leadDetail.lead} 
              researchPacket={leadDetail.researchPacket} 
              isOnCall={!!currentPhoneNumber}
            />
          )}

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
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                    <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  AI Coaching Tips
                </CardTitle>
                {currentPhoneNumber && coachingTips.length > 0 && (
                  <Badge className="bg-blue-600 text-white" data-testid="badge-tips-count">
                    {coachingTips.length} tips
                  </Badge>
                )}
              </div>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Real-time suggestions to guide your conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[220px]">
                {coachingTips.length > 0 ? (
                  <div className="space-y-3 pr-4">
                    {coachingTips.map((tip, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white dark:bg-blue-950/50 rounded-md border border-blue-200 dark:border-blue-800 shadow-sm"
                        data-testid={`coaching-tip-${index}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-full flex-shrink-0">
                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 leading-relaxed">
                              {tip.tip}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              {new Date(tip.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : currentPhoneNumber ? (
                  <div className="h-full flex items-center justify-center py-8">
                    <div className="p-6 bg-white dark:bg-blue-950/50 rounded-md border border-blue-200 dark:border-blue-800 text-center max-w-sm">
                      <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3 animate-pulse" />
                      <p className="text-base font-medium text-blue-900 dark:text-blue-100">
                        Listening for coaching opportunities...
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        AI tips will appear here as you speak with your prospect
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-blue-600 dark:text-blue-400 py-8">
                    <div className="text-center">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Start a call to receive coaching tips</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 cursor-pointer hover-elevate">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Live Transcript
                        {transcripts.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {transcripts.length} messages
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {transcriptOpen ? "Click to collapse" : "Click to expand transcript"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentPhoneNumber && (
                      <Badge variant="secondary" data-testid="badge-active-call">
                        <Phone className="h-3 w-3 mr-1" />
                        {currentPhoneNumber}
                      </Badge>
                    )}
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${transcriptOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <ScrollArea className="h-[250px]">
                    {transcripts.length > 0 || livePartial ? (
                      <div className="space-y-3 pr-4">
                        {transcripts.map((entry, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-md ${
                              entry.speaker === "Agent"
                                ? "bg-primary/10 ml-4"
                                : "bg-muted mr-4"
                            }`}
                            data-testid={`transcript-entry-${index}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {entry.speaker}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{entry.text}</p>
                          </div>
                        ))}
                        {livePartial && (
                          <div
                            className={`p-3 rounded-md opacity-70 ${
                              livePartial.speaker === "Agent"
                                ? "bg-primary/10 ml-4"
                                : "bg-muted mr-4"
                            }`}
                            data-testid="transcript-live-partial"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {livePartial.speaker}
                              </span>
                              <span className="text-xs text-muted-foreground italic">
                                typing...
                              </span>
                            </div>
                            <p className="text-sm italic">{livePartial.text}</p>
                          </div>
                        )}
                        <div ref={transcriptEndRef} />
                      </div>
                    ) : currentPhoneNumber ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Waiting for transcription...</p>
                          <p className="text-xs mt-1">Speak to see your conversation here</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>Start a call to see the live transcript</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold" data-testid="text-calls-today">
                      {transcripts.length > 0 ? 1 : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Calls Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
                    <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold" data-testid="text-talk-time">
                      {talkTime}
                    </p>
                    <p className="text-sm text-muted-foreground">Talk Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                    <Lightbulb className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold" data-testid="text-tips-received">
                      {coachingTips.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Tips Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          {performanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                        <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold" data-testid="text-calls-7days">
                          {performanceSummary?.stats.callsLast7Days || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Calls (7 days)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
                        <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold" data-testid="text-talk-time-7days">
                          {performanceSummary?.stats.talkTimeMinutes || 0}m
                        </p>
                        <p className="text-sm text-muted-foreground">Talk Time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                        <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold" data-testid="text-analyzed-calls">
                          {performanceSummary?.stats.analyzedCalls || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Analyzed Calls</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-md">
                        <CheckCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold" data-testid="text-completed-calls">
                          {performanceSummary?.stats.completedCallsLast7Days || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                        <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <CardTitle className="text-lg text-green-900 dark:text-green-100">Win Replay</CardTitle>
                    </div>
                    <CardDescription className="text-green-700 dark:text-green-300">
                      Your latest coaching highlight
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {performanceSummary?.winHighlight ? (
                      <div className="p-4 bg-white dark:bg-green-950/50 rounded-md border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-900 dark:text-green-100 leading-relaxed">
                          "{performanceSummary.winHighlight.text}"
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                          From call on {new Date(performanceSummary.winHighlight.callDate).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-green-600 dark:text-green-400">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Complete some calls to see your wins!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-md">
                        <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <CardTitle className="text-lg text-amber-900 dark:text-amber-100">Focus This Week</CardTitle>
                    </div>
                    <CardDescription className="text-amber-700 dark:text-amber-300">
                      Your top skill to work on
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {performanceSummary?.focusArea ? (
                      <div className="p-4 bg-white dark:bg-amber-950/50 rounded-md border border-amber-200 dark:border-amber-800">
                        <Badge className="bg-amber-600 text-white mb-2">
                          {performanceSummary.focusArea.skill}
                        </Badge>
                        <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                          {performanceSummary.focusArea.suggestion}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-amber-600 dark:text-amber-400">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Complete some calls to get coaching tips!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    <CardTitle>Recent Coaching Insights</CardTitle>
                  </div>
                  <CardDescription>
                    Your latest call analyses and personalized feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceSummary?.recentCalls && performanceSummary.recentCalls.length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4 pr-4">
                        {performanceSummary.recentCalls.map((call) => (
                          <div
                            key={call.id}
                            className="p-4 bg-muted/50 rounded-md border"
                            data-testid={`performance-call-${call.id}`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {call.toNumber}
                                </Badge>
                                {call.disposition && (
                                  <Badge variant="outline">{call.disposition}</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {call.callDate ? new Date(call.callDate).toLocaleDateString() : ""}
                                {call.duration && ` - ${Math.round(call.duration / 60)}m`}
                              </span>
                            </div>
                            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                              {call.coachingNotes.split('\n').map((line, i) => (
                                <p key={i} className="mb-2">{line}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No analyzed calls yet.</p>
                      <p className="text-sm mt-1">Complete calls and get AI analysis to see insights here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedCall} onOpenChange={(open) => { 
        if (!open) {
          setSelectedCall(null);
          setAnalysisResult(null);
          setManagerAnalysis(null);
          setRecordingAnalysis(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
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
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant={selectedCall?.status === "completed" ? "secondary" : "outline"}>
                {selectedCall?.status}
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
              {showAeSelector && selectedCall && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
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
            </div>

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

            {selectedCall?.coachingNotes && !recordingAnalysis && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Coaching feedback available in the "My Performance" tab
                </p>
              </div>
            )}
            
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
