import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Phone, 
  User, 
  Clock, 
  Calendar,
  FileText,
  Play,
  Pause,
  Save,
  Loader2,
  Star,
  Building2,
  Mail,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Target
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CallSession, Lead } from "@shared/schema";

interface ClaudeAnalysis {
  overallScore: number;
  callSummary: string;
  strengths: string[];
  areasForImprovement: string[];
  keyMoments: Array<{ description: string; type: string }>;
  recommendedActions: string[];
  talkRatio: { rep: number; prospect: number };
  questionQuality: { score: number; openEnded: number; closedEnded: number; notes: string };
  objectionHandling: { score: number; objections: string[]; responses: string[]; notes: string };
  nextSteps: string[];
}

function parseClaudeAnalysis(coachingNotes: string | null): ClaudeAnalysis | null {
  if (!coachingNotes) return null;
  try {
    const parsed = JSON.parse(coachingNotes);
    if (parsed.overallScore !== undefined) {
      return parsed as ClaudeAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

interface CallReviewData {
  callSession: CallSession;
  lead: Lead | null;
  caller: { id: string; name: string; email: string; role: string } | null;
}

interface CallReviewDialogProps {
  callId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDisposition(disposition: string): string {
  const map: Record<string, string> = {
    "connected": "Connected",
    "voicemail": "Voicemail",
    "no-answer": "No Answer",
    "busy": "Busy",
    "callback-scheduled": "Callback Scheduled",
    "not-interested": "Not Interested",
    "qualified": "Qualified",
    "meeting-booked": "Meeting Booked",
  };
  return map[disposition] || disposition;
}

function getDispositionColor(disposition: string): string {
  const colors: Record<string, string> = {
    "connected": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "qualified": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "meeting-booked": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    "voicemail": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    "callback-scheduled": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    "not-interested": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    "no-answer": "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
    "busy": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };
  return colors[disposition] || "bg-muted text-muted-foreground";
}

export function CallReviewDialog({ callId, open, onOpenChange }: CallReviewDialogProps) {
  const { toast } = useToast();
  const [managerSummary, setManagerSummary] = useState("");
  const [coachingNotes, setCoachingNotes] = useState("");
  const [sentimentScore, setSentimentScore] = useState<number[]>([3]);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: reviewData, isLoading } = useQuery<CallReviewData>({
    queryKey: ["/api/manager/call-review", callId],
    queryFn: async () => {
      const res = await fetch(`/api/manager/call-review/${callId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch call review data");
      return res.json();
    },
    enabled: !!callId && open,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const hasClaudeAnalysis = reviewData?.callSession?.coachingNotes && 
        parseClaudeAnalysis(reviewData.callSession.coachingNotes);
      
      const payload: Record<string, unknown> = {
        managerSummary,
        sentimentScore: sentimentScore[0],
      };
      
      if (!hasClaudeAnalysis) {
        payload.coachingNotes = coachingNotes;
      }
      
      const res = await apiRequest("PATCH", `/api/manager/call-review/${callId}/notes`, payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Notes Saved", description: "Your review notes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/oversight"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager/call-review", callId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save notes.", variant: "destructive" });
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setManagerSummary("");
      setCoachingNotes("");
      setSentimentScore([3]);
      setIsPlaying(false);
    } else if (reviewData?.callSession) {
      setManagerSummary(reviewData.callSession.managerSummary || "");
      const hasClaudeAnalysis = parseClaudeAnalysis(reviewData.callSession.coachingNotes);
      if (!hasClaudeAnalysis) {
        setCoachingNotes(reviewData.callSession.coachingNotes || "");
      }
      setSentimentScore([reviewData.callSession.sentimentScore || 3]);
    }
    onOpenChange(newOpen);
  };

  if (!callId) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Review
          </DialogTitle>
          <DialogDescription>
            Review call recording, transcript, and add coaching notes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reviewData ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Call Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{reviewData.callSession.toNumber || reviewData.callSession.fromNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {reviewData.callSession.startedAt 
                          ? new Date(reviewData.callSession.startedAt).toLocaleString() 
                          : "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {reviewData.callSession.duration 
                          ? `${Math.floor(reviewData.callSession.duration / 60)}m ${reviewData.callSession.duration % 60}s`
                          : "Unknown duration"}
                      </span>
                    </div>
                    {reviewData.callSession.disposition && (
                      <div className="flex items-center gap-2">
                        <Badge className={getDispositionColor(reviewData.callSession.disposition)}>
                          {formatDisposition(reviewData.callSession.disposition)}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Caller & Lead</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {reviewData.caller && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{reviewData.caller.name}</span>
                        <Badge variant="outline" className="text-xs">{reviewData.caller.role}</Badge>
                      </div>
                    )}
                    {reviewData.lead && (
                      <>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{reviewData.lead.contactName}</span>
                        </div>
                        {reviewData.lead.companyName && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{reviewData.lead.companyName}</span>
                          </div>
                        )}
                        {reviewData.lead.contactEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{reviewData.lead.contactEmail}</span>
                          </div>
                        )}
                      </>
                    )}
                    {!reviewData.lead && (
                      <p className="text-muted-foreground">No lead associated</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {reviewData.callSession.recordingUrl && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <audio 
                      controls 
                      className="w-full"
                      src={reviewData.callSession.recordingUrl}
                      data-testid="audio-recording"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </CardContent>
                </Card>
              )}

              {reviewData.callSession.transcriptText && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px] rounded-md border p-3 bg-muted/30">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {reviewData.callSession.transcriptText}
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {reviewData.callSession.sdrNotes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">SDR Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{reviewData.callSession.sdrNotes}</p>
                    {reviewData.callSession.keyTakeaways && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Key Takeaways:</p>
                        <p className="text-sm">{reviewData.callSession.keyTakeaways}</p>
                      </div>
                    )}
                    {reviewData.callSession.nextSteps && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Next Steps:</p>
                        <p className="text-sm">{reviewData.callSession.nextSteps}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {(() => {
                const claudeAnalysis = parseClaudeAnalysis(reviewData.callSession.coachingNotes);
                if (!claudeAnalysis) return null;
                
                return (
                  <Card className="border-2 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        AI Coaching Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Overall Score</span>
                            <span className="text-2xl font-bold text-primary">{claudeAnalysis.overallScore}/100</span>
                          </div>
                          <Progress value={claudeAnalysis.overallScore} className="h-2" />
                        </div>
                      </div>

                      {claudeAnalysis.callSummary && (
                        <div className="p-3 bg-muted/50 rounded-md">
                          <p className="text-sm">{claudeAnalysis.callSummary}</p>
                        </div>
                      )}

                      <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="questions">Questions</TabsTrigger>
                          <TabsTrigger value="objections">Objections</TabsTrigger>
                          <TabsTrigger value="actions">Actions</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="overview" className="space-y-3 mt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-xs font-semibold text-green-700 dark:text-green-400">Strengths</span>
                              </div>
                              <ul className="space-y-1">
                                {claudeAnalysis.strengths.slice(0, 3).map((s, i) => (
                                  <li key={i} className="text-xs text-green-800 dark:text-green-300">{s}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Improve</span>
                              </div>
                              <ul className="space-y-1">
                                {claudeAnalysis.areasForImprovement.slice(0, 3).map((a, i) => (
                                  <li key={i} className="text-xs text-amber-800 dark:text-amber-300">{a}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-muted/50 rounded-md">
                              <span className="text-xs text-muted-foreground">Talk Ratio</span>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary" 
                                    style={{ width: `${claudeAnalysis.talkRatio.rep}%` }} 
                                  />
                                </div>
                                <span className="text-xs font-medium">{claudeAnalysis.talkRatio.rep}% Rep</span>
                              </div>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-md">
                              <span className="text-xs text-muted-foreground">Prospect Speaking</span>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500" 
                                    style={{ width: `${claudeAnalysis.talkRatio.prospect}%` }} 
                                  />
                                </div>
                                <span className="text-xs font-medium">{claudeAnalysis.talkRatio.prospect}%</span>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="questions" className="space-y-3 mt-3">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                            <div>
                              <span className="text-xs text-muted-foreground">Question Quality Score</span>
                              <p className="text-lg font-bold">{claudeAnalysis.questionQuality.score}/10</p>
                            </div>
                            <div className="text-right">
                              <div className="flex gap-3">
                                <div>
                                  <span className="text-xs text-muted-foreground">Open-ended</span>
                                  <p className="text-sm font-medium text-green-600">{claudeAnalysis.questionQuality.openEnded}</p>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">Closed</span>
                                  <p className="text-sm font-medium text-amber-600">{claudeAnalysis.questionQuality.closedEnded}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          {claudeAnalysis.questionQuality.notes && (
                            <p className="text-xs text-muted-foreground">{claudeAnalysis.questionQuality.notes}</p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="objections" className="space-y-3 mt-3">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                            <span className="text-xs text-muted-foreground">Objection Handling Score</span>
                            <p className="text-lg font-bold">{claudeAnalysis.objectionHandling.score}/10</p>
                          </div>
                          {claudeAnalysis.objectionHandling.objections.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold">Objections Raised:</span>
                              <ul className="mt-1 space-y-1">
                                {claudeAnalysis.objectionHandling.objections.map((o, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                    <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    {o}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {claudeAnalysis.objectionHandling.notes && (
                            <p className="text-xs text-muted-foreground mt-2">{claudeAnalysis.objectionHandling.notes}</p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="actions" className="space-y-3 mt-3">
                          {claudeAnalysis.recommendedActions.length > 0 && (
                            <div>
                              <span className="text-xs font-semibold">Recommended Actions:</span>
                              <ul className="mt-2 space-y-2">
                                {claudeAnalysis.recommendedActions.map((action, i) => (
                                  <li key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs">
                                    <Target className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {claudeAnalysis.nextSteps.length > 0 && (
                            <div className="mt-3">
                              <span className="text-xs font-semibold">Next Steps:</span>
                              <ul className="mt-1 space-y-1">
                                {claudeAnalysis.nextSteps.map((step, i) => (
                                  <li key={i} className="text-xs text-muted-foreground">• {step}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                );
              })()}

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Manager Review</h3>

                <div className="space-y-2">
                  <Label htmlFor="sentiment">Call Quality Score</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      id="sentiment"
                      value={sentimentScore}
                      onValueChange={setSentimentScore}
                      min={1}
                      max={5}
                      step={1}
                      className="flex-1"
                      data-testid="slider-sentiment"
                    />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Star
                          key={score}
                          className={`h-4 w-4 ${
                            score <= sentimentScore[0]
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="managerSummary">Manager Summary</Label>
                  <Textarea
                    id="managerSummary"
                    placeholder="Overall assessment of the call..."
                    value={managerSummary}
                    onChange={(e) => setManagerSummary(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="input-manager-summary"
                  />
                </div>

                {!parseClaudeAnalysis(reviewData.callSession.coachingNotes) && (
                  <div className="space-y-2">
                    <Label htmlFor="coachingNotes">Coaching Notes</Label>
                    <Textarea
                      id="coachingNotes"
                      placeholder="Specific feedback and areas for improvement..."
                      value={coachingNotes}
                      onChange={(e) => setCoachingNotes(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="input-coaching-notes"
                    />
                  </div>
                )}

                <Button 
                  onClick={() => saveNotesMutation.mutate()}
                  disabled={saveNotesMutation.isPending}
                  className="w-full"
                  data-testid="button-save-review"
                >
                  {saveNotesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Review
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Call not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
