import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Softphone } from "@/components/softphone";
import { CallBrief } from "@/components/call-brief";
import { PostCallSummaryForm, type CallOutcomeData } from "@/components/post-call-summary-form";
import { useTranscription } from "@/hooks/use-transcription";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Phone, MessageSquare, Clock, Activity, Lightbulb, Wifi, WifiOff, History, ChevronDown, FileText, Play, User, Building2, Target, HelpCircle, Sparkles, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CallSession, Lead, ResearchPacket } from "@shared/schema";

export default function CoachingPage() {
  const { user } = useAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const leadIdParam = params.get("leadId");
  const phoneParam = params.get("phone");
  
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [talkTime, setTalkTime] = useState("0:00");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
  const [callPrepOpen, setCallPrepOpen] = useState(!!leadIdParam);
  const [pendingOutcomeCallId, setPendingOutcomeCallId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { data: leadDetail } = useQuery<{ lead: Lead; researchPacket: ResearchPacket | null }>({
    queryKey: ["/api/leads", leadIdParam],
    enabled: !!leadIdParam,
  });

  const { data: callHistory = [], isLoading: historyLoading } = useQuery<CallSession[]>({
    queryKey: ["/api/call-sessions"],
    enabled: historyOpen,
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

  const handleCallStart = (phoneNumber: string) => {
    setCurrentPhoneNumber(phoneNumber);
    setCallStartTime(new Date());
    clearTranscripts();
  };

  const handleCallEnd = (callSessionId?: string) => {
    if (callSessionId) {
      setPendingOutcomeCallId(callSessionId);
    }
    setCurrentPhoneNumber(null);
    setCurrentCallSid(null);
    setCallStartTime(null);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Live Coaching</h1>
          <p className="text-muted-foreground">
            Make calls and receive real-time AI coaching tips during your conversations.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Softphone onCallStart={handleCallStart} onCallEnd={handleCallEnd} isAuthenticated={!!user} initialPhoneNumber={phoneParam || undefined} />
          
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

      <Dialog open={!!selectedCall} onOpenChange={(open) => { 
        if (!open) {
          setSelectedCall(null);
          setAnalysisResult(null);
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
                  onClick={() => window.open(selectedCall.recordingUrl!, "_blank")}
                  data-testid="button-play-recording"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Play Recording
                </Button>
              )}
              {selectedCall?.status === "completed" && selectedCall?.transcriptText && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => selectedCall.id && analyzeMutation.mutate(selectedCall.id)}
                  disabled={analyzeMutation.isPending}
                  data-testid="button-analyze-call"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Analyze Call
                </Button>
              )}
            </div>

            {analysisResult && (
              <div className="space-y-3">
                <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    Manager Summary
                  </h4>
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    {analysisResult.managerSummary.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-900">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Lightbulb className="h-4 w-4" />
                    Personalized Coaching
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                    {analysisResult.coachingMessage}
                  </p>
                </div>
              </div>
            )}

            {(selectedCall?.managerSummary || selectedCall?.coachingNotes) && !analysisResult && (
              <div className="space-y-3">
                {selectedCall.managerSummary && (
                  <div className="p-4 bg-primary/5 rounded-md border border-primary/20">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      Manager Summary
                    </h4>
                    {(() => {
                      try {
                        const parsed = JSON.parse(selectedCall.managerSummary);
                        if (Array.isArray(parsed)) {
                          return (
                            <ul className="space-y-1 text-sm list-disc list-inside">
                              {parsed.map((item: string, i: number) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p className="text-sm whitespace-pre-wrap">{selectedCall.managerSummary}</p>;
                      } catch {
                        return <p className="text-sm whitespace-pre-wrap">{selectedCall.managerSummary}</p>;
                      }
                    })()}
                  </div>
                )}
                {selectedCall.coachingNotes && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-900">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                      <Lightbulb className="h-4 w-4" />
                      Coaching Notes
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                      {selectedCall.coachingNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {selectedCall?.transcriptText ? (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transcript
                </h4>
                <ScrollArea className="h-[200px] border rounded-md p-3">
                  <div className="space-y-2 text-sm whitespace-pre-wrap">
                    {selectedCall.transcriptText}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No transcript available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
