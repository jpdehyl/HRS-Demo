import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  FileSearch, 
  Loader2,
  ExternalLink,
  Briefcase,
  Target,
  MessageSquare,
  HelpCircle,
  Shield,
  Lightbulb,
  Upload,
  AlertTriangle,
  TrendingUp,
  Link2,
  Globe,
  CheckCircle2,
  Clock,
  Crosshair
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Lead, ResearchPacket } from "@shared/schema";

interface LeadWithResearch extends Lead {
  hasResearch: boolean;
  researchStatus: string | null;
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadWithResearch | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: leads = [], isLoading } = useQuery<LeadWithResearch[]>({
    queryKey: ["/api/leads"],
  });

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
      toast({ title: "Research complete", description: "Lead dossier has been generated" });
    },
    onError: () => {
      toast({ title: "Research failed", description: "Could not generate research for this lead", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (selectedLead && leads.length > 0) {
      const updatedLead = leads.find(l => l.id === selectedLead.id);
      if (updatedLead && (updatedLead.hasResearch !== selectedLead.hasResearch || 
          updatedLead.contactLinkedIn !== selectedLead.contactLinkedIn ||
          updatedLead.contactPhone !== selectedLead.contactPhone)) {
        setSelectedLead(updatedLead);
      }
    }
  }, [leads, selectedLead]);

  const filteredLeads = leads.filter(lead => 
    lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "contacted": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "qualified": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "lost": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default: return "bg-muted";
    }
  };

  const handleCallLead = (lead: LeadWithResearch) => {
    navigate(`/coaching?phone=${encodeURIComponent(lead.contactPhone || "")}&leadId=${lead.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-leads">Contact Directory</h1>
          <p className="text-muted-foreground">
            Manage leads and access AI-powered research dossiers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)} data-testid="button-import-leads">
            <Upload className="h-4 w-4 mr-2" />
            Import from Sheets
          </Button>
          <Button data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, company, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-leads"
          />
        </div>
        <Badge variant="secondary" data-testid="text-lead-count">
          {filteredLeads.length} leads
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Leads</CardTitle>
              <CardDescription>Click a lead to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No leads found</p>
                    <p className="text-sm mt-1">Import leads from Google Sheets to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-2">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`p-3 rounded-md cursor-pointer hover-elevate ${
                          selectedLead?.id === lead.id ? "bg-accent" : "bg-muted/50"
                        }`}
                        data-testid={`lead-card-${lead.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{lead.contactName}</p>
                            <p className="text-sm text-muted-foreground truncate">{lead.companyName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(lead.status)}`}>
                              {lead.status}
                            </Badge>
                            {lead.hasResearch && (
                              <Badge variant="secondary" className="text-xs">
                                <FileSearch className="h-3 w-3 mr-1" />
                                Intel
                              </Badge>
                            )}
                          </div>
                        </div>
                        {lead.contactTitle && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{lead.contactTitle}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedLead ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedLead.contactName}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4" />
                    {selectedLead.companyName}
                    {selectedLead.contactTitle && (
                      <span className="text-muted-foreground">- {selectedLead.contactTitle}</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedLead.contactPhone && (
                    <Button size="sm" onClick={() => handleCallLead(selectedLead)} data-testid="button-call-lead">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                  )}
                  {selectedLead.contactEmail && (
                    <Button size="sm" variant="outline" asChild data-testid="button-email-lead">
                      <a href={`mailto:${selectedLead.contactEmail}`}>
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </a>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge className={getStatusColor(selectedLead.status)}>{selectedLead.status}</Badge>
                  {selectedLead.companyIndustry && (
                    <Badge variant="outline">{selectedLead.companyIndustry}</Badge>
                  )}
                  {selectedLead.companySize && (
                    <Badge variant="outline">{selectedLead.companySize} employees</Badge>
                  )}
                  {selectedLead.contactLinkedIn && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={selectedLead.contactLinkedIn} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                </div>

                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedLead.contactEmail}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{selectedLead.contactPhone || "Not provided"}</p>
                    </div>
                    {selectedLead.contactLinkedIn && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">LinkedIn:</span>
                        <a 
                          href={selectedLead.contactLinkedIn.startsWith("http") ? selectedLead.contactLinkedIn : `https://${selectedLead.contactLinkedIn}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline ml-2 flex items-center gap-1 inline-flex"
                        >
                          <Link2 className="h-3 w-3" />
                          View Profile
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {selectedLead.companyWebsite && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Website:</span>
                        <a 
                          href={selectedLead.companyWebsite.startsWith("http") ? selectedLead.companyWebsite : `https://${selectedLead.companyWebsite}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary hover:underline ml-2 inline-flex items-center gap-1"
                        >
                          {selectedLead.companyWebsite}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {detailLoading && !leadDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : leadDetail?.researchPacket ? (
                  <IntelligenceDossier 
                    packet={leadDetail.researchPacket} 
                    lead={selectedLead}
                    onRefresh={() => researchMutation.mutate(selectedLead.id)}
                    isRefreshing={researchMutation.isPending}
                  />
                ) : (
                  <div className="text-center py-8 border rounded-md border-dashed">
                    <FileSearch className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="font-medium mb-1">No Intelligence Dossier</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate AI-powered intelligence to prepare for your engagement
                    </p>
                    <Button 
                      onClick={() => researchMutation.mutate(selectedLead.id)}
                      disabled={researchMutation.isPending}
                      data-testid="button-generate-research"
                    >
                      {researchMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Gathering Intel...
                        </>
                      ) : (
                        <>
                          <Crosshair className="h-4 w-4 mr-2" />
                          Generate Dossier
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">Select a lead to view details</p>
                  <p className="text-sm mt-1">Click on any lead in the list to see their profile and research dossier</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ImportModal open={showImportModal} onOpenChange={setShowImportModal} />
    </div>
  );
}

function IntelligenceDossier({ 
  packet, 
  lead,
  onRefresh,
  isRefreshing
}: { 
  packet: ResearchPacket;
  lead: LeadWithResearch;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Crosshair className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Intelligence Dossier</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Generated: {formatDate(packet.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={packet.verificationStatus === "verified" ? "default" : "outline"} className="text-xs">
            {packet.verificationStatus === "verified" ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" /> Unverified</>
            )}
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh-research"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSearch className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="executive" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="executive" className="text-xs">Executive</TabsTrigger>
          <TabsTrigger value="company" className="text-xs">Company</TabsTrigger>
          <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
          <TabsTrigger value="strategy" className="text-xs">Strategy</TabsTrigger>
          <TabsTrigger value="objections" className="text-xs">Objections</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="mt-4 space-y-4">
          <IntelSection 
            icon={Target}
            title="FIT ASSESSMENT"
            priority="high"
            content={packet.fitAnalysis}
          />
          <IntelSection 
            icon={MessageSquare}
            title="RECOMMENDED TALK TRACK"
            content={packet.talkTrack}
          />
        </TabsContent>

        <TabsContent value="company" className="mt-4 space-y-4">
          <IntelSection 
            icon={Building2}
            title="COMPANY INTELLIGENCE"
            content={packet.companyIntel}
          />
          <IntelSection 
            icon={TrendingUp}
            title="BUSINESS TRIGGERS & OPPORTUNITIES"
            content={packet.companyHardIntel}
          />
          <IntelSection 
            icon={AlertTriangle}
            title="PAIN SIGNALS DETECTED"
            priority="medium"
            content={packet.painSignals}
          />
        </TabsContent>

        <TabsContent value="contact" className="mt-4 space-y-4">
          <IntelSection 
            icon={User}
            title="CONTACT PROFILE"
            content={packet.contactIntel}
          />
          {packet.sources && (
            <IntelSection 
              icon={Link2}
              title="INTELLIGENCE SOURCES"
              content={packet.sources}
            />
          )}
        </TabsContent>

        <TabsContent value="strategy" className="mt-4 space-y-4">
          <IntelSection 
            icon={HelpCircle}
            title="DISCOVERY QUESTIONS"
            content={packet.discoveryQuestions}
          />
        </TabsContent>

        <TabsContent value="objections" className="mt-4 space-y-4">
          <IntelSection 
            icon={Shield}
            title="OBJECTION HANDLING"
            content={packet.objectionHandles}
          />
          <IntelSection 
            icon={Globe}
            title="COMPETITIVE LANDSCAPE"
            content={packet.competitorPresence}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntelSection({ 
  icon: Icon, 
  title, 
  content,
  priority
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  content: string | null;
  priority?: "high" | "medium" | "low";
}) {
  if (!content) return null;

  const priorityStyles = {
    high: "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
    medium: "border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
    low: "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  };

  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: JSX.Element[] = [];
    let listKey = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(<ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 mb-2">{listItems}</ul>);
        listItems = [];
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\./)) {
        listItems.push(
          <li key={i} className="text-foreground/90">
            {trimmed.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')}
          </li>
        );
        return;
      }
      
      flushList();
      
      if (trimmed.endsWith(':') && trimmed.length < 60) {
        elements.push(<p key={i} className="font-semibold mt-3 mb-1 text-foreground">{trimmed}</p>);
        return;
      }
      
      elements.push(<p key={i} className="mb-2">{trimmed}</p>);
    });

    flushList();
    return elements;
  };
  
  return (
    <div className={`p-4 rounded-md ${priority ? priorityStyles[priority] : "bg-muted/30"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
        {priority && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            {priority.toUpperCase()} PRIORITY
          </Badge>
        )}
      </div>
      <div className="text-sm leading-relaxed text-foreground/90">
        {formatContent(content)}
      </div>
    </div>
  );
}

function DossierSection({ 
  icon: Icon, 
  title, 
  content 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  content: string | null;
}) {
  if (!content) return null;
  
  return (
    <div className="p-4 bg-muted/30 rounded-md">
      <h4 className="font-medium flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h4>
      <div className="text-sm whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function ImportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const res = await apiRequest("POST", "/api/leads/import", {});
      const response = await res.json();
      
      toast({
        title: "Import complete",
        description: `Imported ${response.imported} leads. ${response.duplicates} duplicates skipped.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Could not import leads from the spreadsheet. Please check Google credentials.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Import lead data from the configured Hawk Ridge Systems leads spreadsheet
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-md text-sm">
            <p className="font-medium mb-2">The import will look for these columns:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Company Name (required)</li>
              <li>Contact Name (required)</li>
              <li>Email (required)</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Optional: Title, Phone, LinkedIn, Website, Industry, Size
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Duplicate leads (by email) will be automatically skipped.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting} data-testid="button-confirm-import">
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Leads
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
