import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Clock, Calendar, User, Building2, ChevronRight, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { TimeRange } from "./time-range-selector";

interface DrillDownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "disposition" | "funnel";
  filter: string;
  filterLabel: string;
  timeRange: TimeRange;
  onCallClick?: (callId: string) => void;
  onLeadClick?: (leadId: string) => void;
}

interface DrillDownCall {
  id: string;
  leadId: string | null;
  companyName: string | null;
  contactName: string | null;
  toNumber: string;
  disposition: string;
  duration: number | null;
  startedAt: string;
}

interface DrillDownResponse {
  calls: DrillDownCall[];
  total: number;
  filter: string;
}

const DISPOSITION_COLORS: Record<string, string> = {
  "qualified": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  "meeting-booked": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "connected": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "callback-scheduled": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "not-interested": "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  "no-answer": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "voicemail": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "wrong-number": "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DrillDownModal({
  open,
  onOpenChange,
  type,
  filter,
  filterLabel,
  timeRange,
  onCallClick,
  onLeadClick,
}: DrillDownModalProps) {
  const { data, isLoading } = useQuery<DrillDownResponse>({
    queryKey: ["/api/dashboard/drilldown", type, filter, timeRange],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/drilldown?type=${type}&filter=${encodeURIComponent(filter)}&range=${timeRange}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch drill-down data");
      return res.json();
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {filterLabel} Calls
          </DialogTitle>
          <DialogDescription>
            {data ? `${data.total} calls matching this criteria` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.calls.length ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Phone className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No calls found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.calls.map((call) => (
                <div
                  key={call.id}
                  className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onCallClick?.(call.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {call.companyName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium truncate">{call.companyName}</span>
                          </div>
                        ) : (
                          <span className="font-medium">{call.toNumber}</span>
                        )}
                        <Badge className={DISPOSITION_COLORS[call.disposition] || "bg-gray-100"}>
                          {call.disposition?.replace("-", " ") || "Unknown"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {call.contactName && (
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>{call.contactName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(call.startedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatDuration(call.duration)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {call.leadId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLeadClick?.(call.leadId!);
                          }}
                        >
                          View Lead
                          <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
