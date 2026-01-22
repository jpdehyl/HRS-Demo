import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import {
  Flame,
  Clock,
  Phone,
  FileSearch,
  Mail,
  AlertCircle,
  ChevronRight,
  Calendar,
  Target,
  Sparkles,
} from "lucide-react";

interface WorkQueueItem {
  id: string;
  type: "hot_lead" | "follow_up" | "needs_research" | "callback" | "voicemail";
  title: string;
  subtitle: string;
  priority: "high" | "medium" | "low";
  dueTime?: string;
  leadId?: string;
  phone?: string | null;
}

interface WorkQueueProps {
  items: WorkQueueItem[];
  onCallLead?: (leadId: string, phone: string) => void;
  onViewLead?: (leadId: string) => void;
  isLoading?: boolean;
  className?: string;
}

const typeConfig = {
  hot_lead: {
    icon: Flame,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    label: "Hot Lead",
  },
  follow_up: {
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    label: "Follow Up",
  },
  needs_research: {
    icon: FileSearch,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    label: "Needs Research",
  },
  callback: {
    icon: Phone,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    label: "Callback",
  },
  voicemail: {
    icon: Mail,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    label: "Voicemail",
  },
};

const priorityConfig = {
  high: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  medium: { label: "Soon", className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  low: { label: "Later", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

function WorkQueueItemRow({
  item,
  onCall,
  onView,
}: {
  item: WorkQueueItem;
  onCall?: () => void;
  onView?: () => void;
}) {
  const config = typeConfig[item.type];
  const priority = priorityConfig[item.priority];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:shadow-sm cursor-pointer ${config.bgColor}`}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onView?.()}
    >
      <div className={`p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{item.title}</p>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priority.className}`}>
            {priority.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="truncate">{item.subtitle}</span>
          {item.dueTime && (
            <>
              <span>-</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.dueTime}
              </span>
            </>
          )}
        </div>
      </div>
      {item.phone && onCall && (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCall();
          }}
          className="h-8 bg-hawk-blue hover:bg-hawk-blue-600 text-white shrink-0"
        >
          <Phone className="h-3 w-3 mr-1" />
          Call
        </Button>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

export function WorkQueue({
  items,
  onCallLead,
  onViewLead,
  isLoading = false,
  className = "",
}: WorkQueueProps) {
  const hotLeads = items.filter((i) => i.type === "hot_lead");
  const followUps = items.filter((i) => i.type === "follow_up" || i.type === "callback");
  const needsAttention = items.filter((i) => i.type === "needs_research" || i.type === "voicemail");

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-hawk-blue" />
            My Work Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-hawk-blue" />
            My Work Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium">All caught up!</p>
            <p className="text-sm mt-1">No pending tasks in your queue</p>
            <Link href="/leads">
              <Button variant="outline" size="sm" className="mt-4">
                Browse Leads
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 border-l-hawk-blue ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-hawk-blue" />
              My Work Queue
            </CardTitle>
            <CardDescription>
              {items.length} {items.length === 1 ? "task" : "tasks"} requiring attention
            </CardDescription>
          </div>
          <Link href="/leads">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {/* Hot Leads Section */}
            {hotLeads.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hot Leads ({hotLeads.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {hotLeads.slice(0, 3).map((item) => (
                    <WorkQueueItemRow
                      key={item.id}
                      item={item}
                      onCall={
                        item.phone && onCallLead
                          ? () => onCallLead(item.leadId!, item.phone!)
                          : undefined
                      }
                      onView={onViewLead ? () => onViewLead(item.leadId!) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Follow-ups Section */}
            {followUps.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Follow-ups ({followUps.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {followUps.slice(0, 3).map((item) => (
                    <WorkQueueItemRow
                      key={item.id}
                      item={item}
                      onCall={
                        item.phone && onCallLead
                          ? () => onCallLead(item.leadId!, item.phone!)
                          : undefined
                      }
                      onView={onViewLead ? () => onViewLead(item.leadId!) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Needs Attention Section */}
            {needsAttention.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Needs Attention ({needsAttention.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {needsAttention.slice(0, 3).map((item) => (
                    <WorkQueueItemRow
                      key={item.id}
                      item={item}
                      onView={onViewLead ? () => onViewLead(item.leadId!) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Helper function to convert dashboard metrics to work queue items
export function convertMetricsToWorkQueue(metrics: {
  actionItems: {
    hotLeads: Array<{ id: string; companyName: string; contactName: string; phone: string | null }>;
    leadsWithoutResearch: Array<{ id: string; companyName: string; contactName: string }>;
    callsNeedingAnalysis: Array<{ id: string; toNumber: string; duration: number | null }>;
  };
}): WorkQueueItem[] {
  const items: WorkQueueItem[] = [];

  // Hot leads - highest priority
  metrics.actionItems.hotLeads.forEach((lead) => {
    items.push({
      id: `hot-${lead.id}`,
      type: "hot_lead",
      title: lead.companyName,
      subtitle: lead.contactName,
      priority: "high",
      leadId: lead.id,
      phone: lead.phone,
    });
  });

  // Leads without research
  metrics.actionItems.leadsWithoutResearch.forEach((lead) => {
    items.push({
      id: `research-${lead.id}`,
      type: "needs_research",
      title: lead.companyName,
      subtitle: `${lead.contactName} - No intel yet`,
      priority: "medium",
      leadId: lead.id,
    });
  });

  return items;
}
