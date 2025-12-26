import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Softphone } from "@/components/softphone";
import { useTranscription } from "@/hooks/use-transcription";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Phone, MessageSquare, Clock, Activity, Lightbulb, Wifi, WifiOff, History, ChevronDown, FileText, Play } from "lucide-react";
import type { CallSession } from "@shared/schema";

export default function CoachingPage() {
  const { user } = useAuth();
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [talkTime, setTalkTime] = useState("0:00");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallSession | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

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

  const handleCallEnd = () => {
    setCurrentPhoneNumber(null);
    setCurrentCallSid(null);
    setCallStartTime(null);
  };

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
          <Softphone onCallStart={handleCallStart} onCallEnd={handleCallEnd} isAuthenticated={!!user} />
          
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
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Live Transcript
                </CardTitle>
                <CardDescription>
                  Real-time transcription of your call
                </CardDescription>
              </div>
              {currentPhoneNumber && (
                <Badge variant="secondary" data-testid="badge-active-call">
                  <Phone className="h-3 w-3 mr-1" />
                  {currentPhoneNumber}
                </Badge>
              )}
            </CardHeader>
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
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Coaching Tips
              </CardTitle>
              <CardDescription>
                Real-time suggestions to improve your conversation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[180px]">
                {coachingTips.length > 0 ? (
                  <div className="space-y-3 pr-4">
                    {coachingTips.map((tip, index) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-900"
                        data-testid={`coaching-tip-${index}`}
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              {tip.tip}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              {new Date(tip.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : currentPhoneNumber ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-900 text-center">
                      <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Listening for coaching opportunities...
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        AI tips will appear as you speak with your prospect
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>Coaching tips will appear during active calls</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

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

      <Dialog open={!!selectedCall} onOpenChange={() => setSelectedCall(null)}>
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
            <div className="flex items-center gap-4">
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
            </div>
            
            {selectedCall?.transcriptText ? (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transcript
                </h4>
                <ScrollArea className="h-[300px] border rounded-md p-3">
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
