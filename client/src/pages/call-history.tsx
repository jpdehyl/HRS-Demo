import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Phone, Clock, PhoneOutgoing, PhoneIncoming, Play, FileText, Calendar } from "lucide-react";
import type { CallSession } from "@shared/schema";
import { format } from "date-fns";

export default function CallHistoryPage() {
  const { data, isLoading, error } = useQuery<{ calls: CallSession[] }>({
    queryKey: ["/api/voice/calls"],
  });

  const calls = data?.calls || [];

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">In Progress</Badge>;
      case "ringing":
        return <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">Ringing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Failed to load call history. Please try again.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="heading-call-history">Call History</h1>
        <p className="text-muted-foreground" data-testid="text-call-history-description">View your past calls, transcripts, and recordings</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Recent Calls
          </CardTitle>
          <CardDescription data-testid="text-call-count">
            {calls.length} call{calls.length !== 1 ? "s" : ""} in history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-md">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
            ) : calls.length > 0 ? (
              <div className="space-y-3 pr-4">
                {calls
                  .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                  .map((call) => (
                    <div
                      key={call.id}
                      className="p-4 border rounded-md hover-elevate"
                      data-testid={`call-history-item-${call.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-md">
                            {call.direction === "outbound" ? (
                              <PhoneOutgoing className="h-4 w-4" />
                            ) : (
                              <PhoneIncoming className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`call-phone-${call.id}`}>
                              {call.toNumber}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(call.startedAt), "MMM d, yyyy h:mm a")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(call.duration)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(call.status)}
                          <div className="flex gap-1">
                            {call.recordingUrl && (
                              <a
                                href={call.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="icon" variant="ghost" data-testid={`play-recording-${call.id}`}>
                                  <Play className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                            {call.transcriptText && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`view-transcript-${call.id}`}>
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh]">
                                  <DialogHeader>
                                    <DialogTitle>Call Transcript</DialogTitle>
                                  </DialogHeader>
                                  <ScrollArea className="h-[60vh] pr-4">
                                    <div className="space-y-2 whitespace-pre-wrap text-sm">
                                      {call.transcriptText.split("\n").map((line, idx) => {
                                        const isAgent = line.startsWith("Agent:");
                                        const isCustomer = line.startsWith("Customer:");
                                        return (
                                          <p
                                            key={idx}
                                            className={`p-2 rounded-md ${
                                              isAgent
                                                ? "bg-primary/10 ml-4"
                                                : isCustomer
                                                ? "bg-muted mr-4"
                                                : ""
                                            }`}
                                          >
                                            {line}
                                          </p>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground py-12">
                <div className="text-center">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No calls yet</p>
                  <p className="text-xs mt-1">Make your first call from the Live Coaching page</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
