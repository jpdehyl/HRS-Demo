import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  Loader2,
  ExternalLink,
  Target,
  MessageSquare,
  Shield,
  Upload,
  AlertTriangle,
  TrendingUp,
  Globe,
  Clock,
  Crosshair,
  Flame,
  Zap,
  Snowflake,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  MapPin,
  Users,
  DollarSign,
  Award,
  HelpCircle,
  Sparkles,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  ListFilter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiLinkedin, SiX } from "react-icons/si";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Lead, ResearchPacket } from "@shared/schema";

interface LeadWithResearch extends Lead {
  hasResearch: boolean;
  researchStatus: string | null;
}

type SortField = "score" | "name" | "company";
type SortDirection = "asc" | "desc";

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadWithResearch | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [hideGenericEmails, setHideGenericEmails] = useState(false);
  const { toast } = useToast();

  const genericDomains = ["gmail.com", "hotmail.com", "live.com", "outlook.com", "yahoo.com", "aol.com", "icloud.com", "mail.com", "protonmail.com", "zoho.com"];
  const isGenericEmail = (email: string) => {
    const domain = email.split("@")[1]?.toLowerCase();
    return genericDomains.includes(domain);
  };
  const [, navigate] = useLocation();

  const { data: leads = [], isLoading } = useQuery<LeadWithResearch[]>({
    queryKey: ["/api/leads"],
  });

  const researchedLeads = leads.filter(l => l.hasResearch);
  const avgScore = researchedLeads.length > 0 
    ? Math.round(researchedLeads.reduce((sum, l) => sum + (l.fitScore || 0), 0) / researchedLeads.length)
    : 0;
  const hotLeads = leads
    .filter(l => l.hasResearch && l.fitScore && l.fitScore >= 70)
    .sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0))
    .slice(0, 5);

  const { data: leadDetail, isLoading: detailLoading } = useQuery<{ lead: Lead; researchPacket: ResearchPacket | null }>({
    queryKey: ["/api/leads", selectedLead?.id],
    enabled: !!selectedLead,
  });

  const researchMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/research`);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads", selectedLead?.id] });
      toast({ title: "Intel Gathered", description: "Lead dossier compiled successfully" });
    },
    onError: () => {
      toast({ title: "Intel Failed", description: "Could not compile lead dossier", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead?.id]);

  const filteredLeads = leads
    .filter(lead => {
      if (hideGenericEmails && isGenericEmail(lead.contactEmail)) {
        return false;
      }
      return lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contactEmail.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "score":
          comparison = (a.fitScore || 0) - (b.fitScore || 0);
          break;
        case "name":
          comparison = a.contactName.localeCompare(b.contactName);
          break;
        case "company":
          comparison = a.companyName.localeCompare(b.companyName);
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

  const handleCallLead = (lead: LeadWithResearch) => {
    navigate(`/coaching?phone=${encodeURIComponent(lead.contactPhone || "")}&leadId=${lead.id}`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold" data-testid="heading-leads">Lead Intel Database</h1>
            <p className="text-xs text-muted-foreground">
              {leads.length} records | {leads.filter(l => l.hasResearch).length} researched
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} data-testid="button-import-leads">
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`border-r flex flex-col bg-muted/30 transition-all duration-200 ${sidebarCollapsed ? "w-12" : "w-80"}`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expand sidebar"
                data-testid="button-expand-sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="mt-4 text-xs font-mono text-muted-foreground writing-mode-vertical transform rotate-180" style={{ writingMode: "vertical-rl" }}>
                {leads.length} leads
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Stats</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setSidebarCollapsed(true)}
                    aria-label="Collapse sidebar"
                    data-testid="button-collapse-sidebar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-background rounded-md p-2 border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Database className="h-3 w-3" />
                      Researched
                    </div>
                    <div className="text-lg font-bold">{researchedLeads.length}<span className="text-xs text-muted-foreground font-normal">/{leads.length}</span></div>
                  </div>
                  <div className="bg-background rounded-md p-2 border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <BarChart3 className="h-3 w-3" />
                      Avg Score
                    </div>
                    <div className={`text-lg font-bold font-mono ${avgScore >= 70 ? "text-green-600 dark:text-green-400" : avgScore >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"}`}>
                      {researchedLeads.length > 0 ? avgScore : "-"}
                    </div>
                  </div>
                </div>

                {hotLeads.length > 0 && (
                  <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-md p-2 border border-red-500/20 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                      <Flame className="h-3 w-3" />
                      Hot Leads - Call Next
                    </div>
                    <div className="space-y-1">
                      {hotLeads.map(lead => (
                        <button
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`w-full text-left px-2 py-1 rounded text-xs hover-elevate flex items-center justify-between gap-2 ${selectedLead?.id === lead.id ? "bg-red-500/20" : ""}`}
                          data-testid={`button-hot-lead-${lead.id}`}
                        >
                          <span className="truncate">{lead.contactName}</span>
                          <span className="font-mono font-bold text-green-600 dark:text-green-400">{lead.fitScore}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-background"
                    data-testid="input-search-leads"
                  />
                </div>
              </div>

              <div className="p-2 border-b flex items-center gap-2">
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="h-8 text-xs flex-1" data-testid="select-sort-field">
                    <ListFilter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSortDirection(d => d === "asc" ? "desc" : "asc")}
                  aria-label={sortDirection === "desc" ? "Sort ascending" : "Sort descending"}
                  data-testid="button-toggle-sort-direction"
                >
                  {sortDirection === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant={hideGenericEmails ? "default" : "ghost"}
                  onClick={() => setHideGenericEmails(h => !h)}
                  aria-label={hideGenericEmails ? "Show all emails" : "Hide generic emails"}
                  title="Hide Gmail, Hotmail, Yahoo, etc."
                  data-testid="button-toggle-generic-emails"
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No leads found
                    </div>
                  ) : (
                    filteredLeads.map((lead) => (
                      <LeadListItem
                        key={lead.id}
                        lead={lead}
                        isSelected={selectedLead?.id === lead.id}
                        onClick={() => setSelectedLead(lead)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-background">
          {selectedLead ? (
            <LeadDetailPanel
              lead={selectedLead}
              detail={leadDetail}
              isLoading={detailLoading}
              onResearch={() => researchMutation.mutate(selectedLead.id)}
              isResearching={researchMutation.isPending}
              onCall={() => handleCallLead(selectedLead)}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Database className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Select a lead to view intel</p>
                <p className="text-sm mt-1">Click on any record in the list</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImportModal open={showImportModal} onOpenChange={setShowImportModal} />
    </div>
  );
}

function LeadListItem({ 
  lead, 
  isSelected, 
  onClick 
}: { 
  lead: LeadWithResearch; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const getPriorityIcon = (priority: string | null) => {
    switch (priority) {
      case "hot": return <Flame className="h-3 w-3 text-red-500" />;
      case "warm": return <Zap className="h-3 w-3 text-orange-500" />;
      case "cool": return <TrendingUp className="h-3 w-3 text-blue-500" />;
      case "cold": return <Snowflake className="h-3 w-3 text-slate-400" />;
      default: return null;
    }
  };

  const getFitScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-md transition-colors hover-elevate ${
        isSelected 
          ? "bg-primary/10 border border-primary/20" 
          : "hover:bg-muted/50"
      }`}
      data-testid={`button-select-lead-${lead.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{lead.contactName}</span>
            {getPriorityIcon(lead.priority)}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {lead.companyName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {lead.fitScore && (
            <span className={`text-xs font-mono font-bold ${getFitScoreColor(lead.fitScore)}`}>
              {lead.fitScore}
            </span>
          )}
          {lead.hasResearch && (
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Intel available" />
          )}
        </div>
      </div>
    </button>
  );
}

function LeadDetailPanel({
  lead,
  detail,
  isLoading,
  onResearch,
  isResearching,
  onCall
}: {
  lead: LeadWithResearch;
  detail: { lead: Lead; researchPacket: ResearchPacket | null } | undefined;
  isLoading: boolean;
  onResearch: () => void;
  isResearching: boolean;
  onCall: () => void;
}) {
  const packet = detail?.researchPacket;

  const getPriorityBadge = (priority: string | null) => {
    const styles: Record<string, string> = {
      hot: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      warm: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      cool: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      cold: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
    };
    const icons: Record<string, JSX.Element> = {
      hot: <Flame className="h-3 w-3" />,
      warm: <Zap className="h-3 w-3" />,
      cool: <TrendingUp className="h-3 w-3" />,
      cold: <Snowflake className="h-3 w-3" />,
    };
    if (!priority) return null;
    return (
      <Badge variant="outline" className={`${styles[priority] || ""} gap-1`}>
        {icons[priority]}
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const getFitScoreDisplay = (score: number | null) => {
    if (!score) return null;
    const color = score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600";
    const bgColor = score >= 70 ? "bg-green-100 dark:bg-green-900/30" : 
                    score >= 40 ? "bg-yellow-100 dark:bg-yellow-900/30" : 
                    "bg-red-100 dark:bg-red-900/30";
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${bgColor}`}>
        <Target className={`h-4 w-4 ${color}`} />
        <span className={`font-mono font-bold text-lg ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold truncate">{lead.contactName}</h2>
              {getPriorityBadge(packet?.priority || lead.priority)}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {lead.companyName}
              </span>
              {lead.contactTitle && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {lead.contactTitle}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getFitScoreDisplay(packet?.fitScore || lead.fitScore)}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Button size="sm" onClick={onCall} data-testid="button-call-lead">
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          {packet && (
            <Button size="sm" variant="outline" asChild>
              <a href={`/call-prep/${lead.id}`} data-testid="button-call-prep">
                <Crosshair className="h-4 w-4 mr-2" />
                Prep
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={`mailto:${lead.contactEmail}`} data-testid="button-email-lead">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </a>
          </Button>
          {lead.contactLinkedIn && (
            <Button size="sm" variant="outline" asChild>
              <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer">
                <SiLinkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </a>
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={onResearch}
            disabled={isResearching}
            data-testid="button-refresh-intel"
          >
            {isResearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && !detail ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : packet ? (
          <IntelDossier packet={packet} lead={lead} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Crosshair className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Intel Available</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              Generate an AI-powered intelligence dossier with company research, contact analysis, and personalized talk tracks.
            </p>
            <Button onClick={onResearch} disabled={isResearching} data-testid="button-generate-intel">
              {isResearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gathering Intel...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Dossier
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function IntelDossier({ packet, lead }: { packet: ResearchPacket; lead: LeadWithResearch }) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {formatDate(packet.updatedAt)}</span>
          <span className="mx-1">|</span>
          <span>{packet.sources}</span>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <User className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="talk-track" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Talk Track
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6 space-y-6">
          <IntelCard 
            icon={Building2}
            title="Company Overview"
            content={packet.companyIntel}
          />
          
          <IntelCard 
            icon={TrendingUp}
            title="Hard Intel"
            content={packet.companyHardIntel}
            variant="compact"
          />
          
          <IntelCard 
            icon={AlertTriangle}
            title="Pain Signals"
            content={packet.painSignals}
            variant="highlight"
            highlightColor="red"
          />
          
          <IntelCard 
            icon={Globe}
            title="Tech Stack & Competitors"
            content={packet.competitorPresence}
          />
        </TabsContent>

        <TabsContent value="contact" className="mt-6 space-y-6">
          <IntelCard 
            icon={User}
            title="Contact Profile"
            content={packet.contactIntel}
          />
          
          {packet.linkedInIntel && (
            <IntelCard 
              icon={SiLinkedin}
              title="LinkedIn Intel"
              content={packet.linkedInIntel}
              variant="compact"
            />
          )}
          
          {packet.xIntel && (
            <IntelCard 
              icon={SiX}
              title="X.com Intel"
              content={packet.xIntel}
              variant="compact"
            />
          )}
          
          <IntelCard 
            icon={Target}
            title="Fit Analysis"
            content={packet.fitAnalysis}
            variant="highlight"
            highlightColor="green"
          />
        </TabsContent>

        <TabsContent value="talk-track" className="mt-6 space-y-6">
          <IntelCard 
            icon={MessageSquare}
            title="Opening & Value Props"
            content={packet.talkTrack}
            variant="highlight"
            highlightColor="blue"
          />
          
          <IntelCard 
            icon={HelpCircle}
            title="Discovery Questions"
            content={packet.discoveryQuestions}
          />
          
          <IntelCard 
            icon={Shield}
            title="Objection Handles"
            content={packet.objectionHandles}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntelCard({ 
  icon: Icon, 
  title, 
  content,
  variant = "default",
  highlightColor
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  content: string | null;
  variant?: "default" | "compact" | "highlight";
  highlightColor?: "red" | "green" | "blue" | "yellow";
}) {
  if (!content) return null;

  const highlightStyles: Record<string, string> = {
    red: "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
    green: "border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
    blue: "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
    yellow: "border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
  };

  const baseStyles = variant === "highlight" && highlightColor 
    ? highlightStyles[highlightColor] 
    : "bg-muted/30";

  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: JSX.Element[] = [];
    let listKey = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${listKey++}`} className="space-y-1 ml-4">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
        const cleanText = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');
        listItems.push(
          <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
            <ChevronRight className="h-3 w-3 mt-1.5 text-muted-foreground shrink-0" />
            <span>{cleanText}</span>
          </li>
        );
        return;
      }
      
      flushList();
      
      if (trimmed.endsWith(':') && trimmed.length < 60) {
        elements.push(
          <p key={i} className="font-medium text-sm mt-3 mb-1 text-foreground">
            {trimmed}
          </p>
        );
        return;
      }
      
      elements.push(
        <p key={i} className="text-sm text-foreground/90 mb-2">
          {trimmed}
        </p>
      );
    });

    flushList();
    return elements;
  };
  
  return (
    <div className={`p-4 rounded-lg ${baseStyles}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <div className={variant === "compact" ? "text-sm" : ""}>
        {formatContent(content)}
      </div>
    </div>
  );
}

function ImportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null);
  const { toast } = useToast();

  const handleImport = async () => {
    setImporting(true);
    setResults(null);
    
    try {
      const res = await apiRequest("POST", "/api/leads/import");
      const data = await res.json();
      setResults({
        imported: data.imported || 0,
        skipped: data.skipped || 0,
        duplicates: data.duplicates || 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Import Complete", description: `${data.imported} leads imported` });
    } catch (error) {
      toast({ title: "Import Failed", description: "Could not import leads", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
          <DialogDescription>
            Import leads from the connected Google Sheet
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {results ? (
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Badge variant="default">{results.imported}</Badge>
                leads imported successfully
              </p>
              {results.skipped > 0 && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline">{results.skipped}</Badge>
                  rows skipped (missing required fields)
                </p>
              )}
              {results.duplicates > 0 && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="outline">{results.duplicates}</Badge>
                  duplicates detected
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This will import all leads from your configured Google Sheet. Duplicate emails will be skipped.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
