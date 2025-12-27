import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import { Softphone } from "@/components/softphone";
import {
  Search,
  Upload,
  RefreshCw,
  Target,
  Building2,
  User,
  Mail,
  Phone,
  Linkedin,
  ExternalLink,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Clock,
  Loader2,
  Plus,
  Send,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Pencil,
  Twitter,
  Hash,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Lead, ResearchPacket, ContactHistory, LeadQaThread } from "@shared/schema";

const addLeadSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email"),
  contactTitle: z.string().optional(),
  contactPhone: z.string().optional(),
  contactLinkedIn: z.string().optional(),
  companyWebsite: z.string().optional(),
});

const editLeadSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email"),
  contactTitle: z.string().optional(),
  contactPhone: z.string().optional(),
  contactLinkedIn: z.string().optional(),
  companyWebsite: z.string().optional(),
});

const logContactSchema = z.object({
  contactType: z.enum(["call", "email", "meeting", "linkedin", "other"]),
  outcome: z.enum(["connected", "voicemail", "no_answer", "email_sent", "meeting_scheduled", "other"]),
  notes: z.string().min(1, "Notes are required"),
  followUpDate: z.string().optional(),
});

type AddLeadFormValues = z.infer<typeof addLeadSchema>;
type EditLeadFormValues = z.infer<typeof editLeadSchema>;
type LogContactFormValues = z.infer<typeof logContactSchema>;

type LeadWithDetails = Lead & {
  researchPacket?: ResearchPacket;
  contactHistory?: ContactHistory[];
};

// LinkedIn Intel type from deep research
interface LinkedInIntelType {
  currentPosition: string;
  currentCompany: string;
  headline: string;
  tenure: string;
  previousPositions: { title: string; company: string; duration: string }[];
  skills: string[];
  summary: string;
  education: string[];
  researchedAt: string;
}

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case "hot": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "warm": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "cool": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "cold": return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    default: return "bg-muted text-muted-foreground";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "new": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "researching": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "researched": return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "contacted": return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "follow_up": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "won": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "lost": return "bg-red-500/10 text-red-600 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function AddLeadForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const form = useForm<AddLeadFormValues>({
    resolver: zodResolver(addLeadSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      contactEmail: "",
      contactTitle: "",
      contactPhone: "",
      contactLinkedIn: "",
      companyWebsite: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AddLeadFormValues) => {
      const cleanedData = {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactTitle: data.contactTitle || undefined,
        contactPhone: data.contactPhone || undefined,
        contactLinkedIn: data.contactLinkedIn || undefined,
        companyWebsite: data.companyWebsite || undefined,
      };
      return apiRequest("POST", "/api/leads", cleanedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({ title: "Lead added", description: "New lead created successfully" });
      form.reset();
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add lead", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-add-lead">
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} data-testid="input-company-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} data-testid="input-contact-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@acme.com" {...field} data-testid="input-contact-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="VP of Engineering" {...field} data-testid="input-contact-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="555-123-4567" {...field} data-testid="input-contact-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://acme.com" {...field} data-testid="input-company-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contactLinkedIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/in/johnsmith" {...field} data-testid="input-linkedin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-lead">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add Lead
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditLeadForm({ lead, onSuccess }: { lead: Lead; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const form = useForm<EditLeadFormValues>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: {
      companyName: lead.companyName,
      contactName: lead.contactName,
      contactEmail: lead.contactEmail,
      contactTitle: lead.contactTitle || "",
      contactPhone: lead.contactPhone || "",
      contactLinkedIn: lead.contactLinkedIn || "",
      companyWebsite: lead.companyWebsite || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditLeadFormValues) => {
      const cleanedData = {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactTitle: data.contactTitle || null,
        contactPhone: data.contactPhone || null,
        contactLinkedIn: data.contactLinkedIn || null,
        companyWebsite: data.companyWebsite || null,
      };
      return apiRequest("PATCH", `/api/leads/${lead.id}`, cleanedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead updated", description: "Contact information saved" });
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update lead", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-edit-lead">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-company-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-edit-contact-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} data-testid="input-edit-contact-email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="VP of Engineering" {...field} data-testid="input-edit-contact-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="555-123-4567" {...field} data-testid="input-edit-contact-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://acme.com" {...field} data-testid="input-edit-company-website" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contactLinkedIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/in/johnsmith" {...field} data-testid="input-edit-linkedin" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-save-lead">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LogContactForm({ leadId, onSuccess }: { leadId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const form = useForm<LogContactFormValues>({
    resolver: zodResolver(logContactSchema),
    defaultValues: {
      contactType: "call",
      outcome: "connected",
      notes: "",
      followUpDate: "",
    },
  });

  const logMutation = useMutation({
    mutationFn: async (data: LogContactFormValues) => {
      const cleanedData = {
        contactType: data.contactType,
        outcome: data.outcome,
        notes: data.notes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
      };
      return apiRequest("POST", `/api/leads/${leadId}/contacts`, cleanedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Contact logged", description: "Interaction recorded successfully" });
      form.reset();
      setOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log contact", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-log-contact">
          <Send className="w-4 h-4" />
          Log Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Contact Interaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => logMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contact-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-outcome">
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="connected">Connected</SelectItem>
                        <SelectItem value="voicemail">Voicemail</SelectItem>
                        <SelectItem value="no_answer">No Answer</SelectItem>
                        <SelectItem value="email_sent">Email Sent</SelectItem>
                        <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What was discussed? Any key takeaways?"
                      className="resize-none"
                      {...field}
                      data-testid="input-contact-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="followUpDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-followup-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={logMutation.isPending} data-testid="button-submit-contact">
              {logMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Log Contact
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function getFitScoreColor(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 80) return "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30";
  if (score >= 60) return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
  if (score >= 40) return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
  return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30";
}

function LeadCard({
  lead,
  isSelected,
  onClick,
}: {
  lead: Lead;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`p-3 cursor-pointer transition-colors rounded-md hover-elevate ${
        isSelected ? "bg-accent" : ""
      }`}
      onClick={onClick}
      data-testid={`card-lead-${lead.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold shrink-0 border ${getFitScoreColor(lead.fitScore)}`}
          data-testid={`badge-fit-${lead.id}`}
        >
          {lead.fitScore !== null ? lead.fitScore : "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" data-testid={`text-lead-company-${lead.id}`}>
            {lead.companyName}
          </p>
          <p className="text-sm text-muted-foreground truncate" data-testid={`text-lead-contact-${lead.id}`}>
            {lead.contactName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={`text-xs ${getStatusColor(lead.status)}`} data-testid={`badge-status-${lead.id}`}>
              {lead.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

interface XIntelData {
  contactXHandle: string | null;
  contactRecentPosts: string[];
  contactTopics: string[];
  companyXHandle: string | null;
  companyRecentPosts: string[];
  industryTrends: string[];
  conversationStarters: string[];
  relevantHashtags: string[];
}

interface ParsedResearch {
  companyIntel: { summary: string; techStack?: string[]; recentNews?: string[] } | null;
  contactIntel: { background: string; careerHistory?: string[]; interests?: string[] } | null;
  painSignals: string[];
  fitAnalysis: { score: number; rationale: string; productMatches: string[] } | null;
  discoveryQuestions: string[];
  objectionHandles: Array<{ objection: string; response: string }>;
  xIntel: XIntelData | null;
}

function parseResearchPacket(packet: ResearchPacket): ParsedResearch {
  const safeJsonParse = <T,>(str: string | null, fallback: T): T => {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch { return fallback; }
  };
  return {
    companyIntel: safeJsonParse(packet.companyIntel, null),
    contactIntel: safeJsonParse(packet.contactIntel, null),
    painSignals: safeJsonParse(packet.painSignals, []),
    fitAnalysis: safeJsonParse(packet.fitAnalysis, null),
    discoveryQuestions: safeJsonParse(packet.discoveryQuestions, []),
    objectionHandles: safeJsonParse(packet.objectionHandles, []),
    xIntel: safeJsonParse((packet as ResearchPacket & { xIntel?: string }).xIntel ?? null, null),
  };
}

type CallMode = "twilio" | "zoom";

function LeadBriefing({ lead }: { lead: LeadWithDetails }) {
  const { toast } = useToast();
  const [callResult, setCallResult] = useState<{ zoomPhoneUri: string; sessionId: string; phoneNumber: string } | null>(null);
  const [showWebFallback, setShowWebFallback] = useState(false);
  const [editingLinkedIn, setEditingLinkedIn] = useState(false);
  const [linkedInEdits, setLinkedInEdits] = useState<Partial<LinkedInIntelType>>({});
  const [editingXIntel, setEditingXIntel] = useState(false);
  const [xIntelEdits, setXIntelEdits] = useState<Partial<XIntelData>>({});
  const [callMode, setCallMode] = useState<CallMode>("twilio");
  const [showSoftphone, setShowSoftphone] = useState(false);
  const packet = lead.researchPacket;
  const parsed = packet ? parseResearchPacket(packet) : null;

  const researchMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/leads/${lead.id}/research`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Research complete", description: "Lead intelligence has been updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Research failed", description: error.message, variant: "destructive" });
    },
  });

  // Open tel: link to dial via default phone app (Zoom Phone when configured)
  const dialPhone = (telUri: string, phoneNumber: string) => {
    // Create hidden anchor and click to trigger tel: link
    const link = document.createElement("a");
    link.href = telUri;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ 
      title: "Dialing via Zoom Phone", 
      description: phoneNumber 
    });
  };

  const startCallMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/leads/${lead.id}/start-call`);
      return res.json();
    },
    onSuccess: (data: { zoomPhoneUri: string; sessionId: string; phoneNumber: string }) => {
      setCallResult(data);
      setShowWebFallback(false);
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      // Open tel: link to dial
      dialPhone(data.zoomPhoneUri, data.phoneNumber);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start call", description: error.message, variant: "destructive" });
    },
  });

  // Deep LinkedIn research - triggered when user clicks LinkedIn button
  const linkedInResearchMutation = useMutation({
    mutationFn: async () => {
      // Always force refresh to get latest LinkedIn data via SerpAPI
      const res = await apiRequest("POST", `/api/leads/${lead.id}/linkedin-research`, { force: true });
      return res.json();
    },
    onSuccess: (data: { linkedInIntel: LinkedInIntelType; cached: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (data.cached) {
        toast({ title: "LinkedIn Intel", description: "Showing cached LinkedIn profile data" });
      } else {
        toast({ title: "LinkedIn Research Complete", description: "Contact career details have been updated" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "LinkedIn research failed", description: error.message, variant: "destructive" });
    },
  });

  // Save manually edited LinkedIn intel
  const saveLinkedInMutation = useMutation({
    mutationFn: async (updatedIntel: LinkedInIntelType) => {
      const res = await apiRequest("PATCH", `/api/leads/${lead.id}`, {
        linkedInIntel: JSON.stringify(updatedIntel),
        linkedInVerified: true,
        linkedInEditedAt: new Date().toISOString(),
        linkedInEditedBy: "SDR"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setEditingLinkedIn(false);
      setLinkedInEdits({});
      toast({ title: "LinkedIn Intel Updated", description: "Your corrections have been saved and verified" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  // Save manually edited X.com intel
  const saveXIntelMutation = useMutation({
    mutationFn: async (updatedIntel: XIntelData) => {
      const res = await apiRequest("PATCH", `/api/leads/${lead.id}/research`, {
        field: "xIntel",
        value: updatedIntel,
        editedBy: "SDR"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setEditingXIntel(false);
      setXIntelEdits({});
      toast({ title: "X.com Intel Updated", description: "Your corrections have been saved and verified" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const handleStartCall = () => {
    if (callMode === "twilio") {
      setShowSoftphone(true);
    } else if (callResult) {
      dialPhone(callResult.zoomPhoneUri, callResult.phoneNumber);
    } else {
      startCallMutation.mutate();
    }
  };

  const openZoomWebPhone = () => {
    window.open("https://app.zoom.us/wc/phone", "_blank");
    toast({
      title: "Zoom Web opened",
      description: `Dial ${callResult?.phoneNumber || lead.contactPhone} in the web app`,
    });
  };

  const handleTwilioCallStarted = (callSid: string) => {
    toast({ title: "Call started", description: `Connected to ${lead.contactPhone}` });
  };

  const handleTwilioCallEnded = (callSid: string, duration: number) => {
    toast({ 
      title: "Call ended", 
      description: `Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}` 
    });
    queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id] });
    queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-xl font-semibold" data-testid="text-briefing-company">{lead.companyName}</h2>
            <p className="text-muted-foreground" data-testid="text-briefing-contact">{lead.contactName} - {lead.contactTitle || "Unknown Title"}</p>
          </div>
          <EditLeadForm lead={lead} onSuccess={() => {}} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LogContactForm leadId={lead.id} onSuccess={() => {}} />
          <div className="flex items-center gap-1">
            <Select value={callMode} onValueChange={(v) => setCallMode(v as CallMode)}>
              <SelectTrigger className="w-[90px]" data-testid="select-call-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleStartCall}
              disabled={(callMode === "zoom" && startCallMutation.isPending) || !lead.contactPhone}
              variant={callResult && callMode === "zoom" ? "default" : "outline"}
              data-testid="button-call-lead"
            >
              {startCallMutation.isPending && callMode === "zoom" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  {lead.contactPhone ? "Call Lead" : "No Phone"}
                </>
              )}
            </Button>
          </div>
          <Button
            onClick={() => researchMutation.mutate()}
            disabled={researchMutation.isPending || lead.status === "researching"}
            data-testid="button-research"
          >
            {researchMutation.isPending || lead.status === "researching" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {packet ? "Re-Research" : "Research Lead"}
              </>
            )}
          </Button>
        </div>
      </div>

      {showSoftphone && callMode === "twilio" && (
        <Card className="border-primary/30 bg-primary/5 overflow-visible">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  Browser Softphone - Calling {lead.contactName}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSoftphone(false)}
                data-testid="button-close-softphone"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Softphone
              phoneNumber={lead.contactPhone || ""}
              leadId={lead.id}
              onCallStarted={handleTwilioCallStarted}
              onCallEnded={handleTwilioCallEnded}
              compact
            />
          </CardContent>
        </Card>
      )}

      {callResult && callMode === "zoom" && (
        <Card className="border-green-500/30 bg-green-500/5 overflow-visible">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">
                  Zoom Phone opened - Dial: <span className="font-mono font-bold">{callResult.phoneNumber}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => dialPhone(callResult.zoomPhoneUri, callResult.phoneNumber)}
                  data-testid="button-call-again"
                >
                  <Phone className="w-4 h-4" />
                  Dial Again
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/call-prep/${callResult.sessionId}`, "_blank")}
                  data-testid="button-open-coach"
                >
                  View Call Prep
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {lead.contactEmail && (
          <Badge variant="outline" className="gap-1">
            <Mail className="w-3 h-3" />
            {lead.contactEmail}
          </Badge>
        )}
        {lead.contactPhone && (
          <Badge variant="outline" className="gap-1">
            <Phone className="w-3 h-3" />
            {lead.contactPhone}
          </Badge>
        )}
        {lead.contactLinkedIn && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={(e) => {
                e.preventDefault();
                linkedInResearchMutation.mutate();
                // Also open LinkedIn in new tab
                window.open(lead.contactLinkedIn!, "_blank");
              }}
              disabled={linkedInResearchMutation.isPending}
              data-testid="button-linkedin-research"
            >
              {linkedInResearchMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Linkedin className="w-3 h-3" />
                  {lead.linkedInIntel ? "LinkedIn" : "Research LinkedIn"}
                  <ExternalLink className="w-3 h-3" />
                </>
              )}
            </Button>
          </div>
        )}
        {lead.companyWebsite && (
          <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer">
            <Badge variant="outline" className="gap-1 cursor-pointer">
              <Building2 className="w-3 h-3" />
              Website
              <ExternalLink className="w-3 h-3" />
            </Badge>
          </a>
        )}
      </div>

      <Separator />

      {!parsed ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No research yet. Click "Research Lead" to generate AI-powered intelligence.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" data-testid="tab-company">Company</TabsTrigger>
            <TabsTrigger value="contact" data-testid="tab-contact">Contact</TabsTrigger>
            <TabsTrigger value="talktrack" data-testid="tab-talktrack">Talk Track</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-4 space-y-4">
            {parsed.companyIntel && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" data-testid="text-company-summary">{parsed.companyIntel.summary}</p>
                </CardContent>
              </Card>
            )}

            {parsed.painSignals.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Likely Pain Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {parsed.painSignals.map((point: string, i: number) => (
                      <li key={i} className="text-sm">{point}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {parsed.fitAnalysis && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Product Matches
                  </CardTitle>
                  <CardDescription>
                    Fit Score: <span className="font-bold">{lead.fitScore ?? parsed.fitAnalysis.score}</span>/100
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {parsed.fitAnalysis.productMatches.map((product: string, i: number) => (
                      <Badge key={i} variant="secondary">{product}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">{parsed.fitAnalysis.rationale}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contact" className="mt-4 space-y-4">
            {parsed.contactIntel && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Contact Background
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" data-testid="text-contact-background">{parsed.contactIntel.background}</p>
                </CardContent>
              </Card>
            )}

            {parsed.contactIntel?.careerHistory && parsed.contactIntel.careerHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Career History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {parsed.contactIntel.careerHistory.map((item: string, i: number) => (
                      <li key={i} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {parsed.contactIntel?.interests && parsed.contactIntel.interests.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Professional Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {parsed.contactIntel.interests.map((interest: string, i: number) => (
                      <Badge key={i} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LinkedIn Intel - Deep research from LinkedIn profile */}
            {lead.linkedInIntel && (() => {
              const intel = JSON.parse(lead.linkedInIntel) as LinkedInIntelType;
              const isVerified = (lead as Lead & { linkedInVerified?: boolean }).linkedInVerified;
              const editedBy = (lead as Lead & { linkedInEditedBy?: string }).linkedInEditedBy;
              const currentPosition = linkedInEdits.currentPosition ?? intel.currentPosition;
              const tenure = linkedInEdits.tenure ?? intel.tenure;
              const headline = linkedInEdits.headline ?? intel.headline;
              const summary = linkedInEdits.summary ?? intel.summary;

              const handleSave = () => {
                const updated: LinkedInIntelType = {
                  ...intel,
                  ...linkedInEdits
                };
                saveLinkedInMutation.mutate(updated);
              };

              const handleCancel = () => {
                setEditingLinkedIn(false);
                setLinkedInEdits({});
              };

              return (
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Linkedin className="w-4 h-4 text-blue-600" />
                        LinkedIn Profile Intel
                        {isVerified ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                            <ShieldAlert className="w-3 h-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                      </CardTitle>
                      {!editingLinkedIn ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingLinkedIn(true)}
                          data-testid="button-edit-linkedin"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={saveLinkedInMutation.isPending}
                            data-testid="button-cancel-linkedin"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saveLinkedInMutation.isPending}
                            data-testid="button-save-linkedin"
                          >
                            {saveLinkedInMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardDescription>
                      {editingLinkedIn ? (
                        <Input
                          value={headline}
                          onChange={(e) => setLinkedInEdits({ ...linkedInEdits, headline: e.target.value })}
                          className="mt-1"
                          data-testid="input-linkedin-headline"
                        />
                      ) : (
                        headline
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Position</p>
                        {editingLinkedIn ? (
                          <Input
                            value={currentPosition}
                            onChange={(e) => setLinkedInEdits({ ...linkedInEdits, currentPosition: e.target.value })}
                            className="mt-1"
                            data-testid="input-linkedin-position"
                          />
                        ) : (
                          <p className="text-sm font-medium" data-testid="text-linkedin-position">{currentPosition}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Time at Company</p>
                        {editingLinkedIn ? (
                          <Input
                            value={tenure}
                            onChange={(e) => setLinkedInEdits({ ...linkedInEdits, tenure: e.target.value })}
                            className="mt-1"
                            data-testid="input-linkedin-tenure"
                          />
                        ) : (
                          <p className="text-sm font-medium" data-testid="text-linkedin-tenure">{tenure}</p>
                        )}
                      </div>
                    </div>

                    {(intel.summary && intel.summary !== "Unknown") || editingLinkedIn ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Summary</p>
                        {editingLinkedIn ? (
                          <Textarea
                            value={summary}
                            onChange={(e) => setLinkedInEdits({ ...linkedInEdits, summary: e.target.value })}
                            className="mt-1"
                            rows={3}
                            data-testid="input-linkedin-summary"
                          />
                        ) : (
                          <p className="text-sm">{summary}</p>
                        )}
                      </div>
                    ) : null}

                    {intel.previousPositions && intel.previousPositions.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Previous Positions</p>
                        <ul className="space-y-2">
                          {intel.previousPositions.map((pos, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <Clock className="w-3 h-3 mt-1 text-muted-foreground" />
                              <span>
                                <span className="font-medium">{pos.title}</span>
                                <span className="text-muted-foreground"> at {pos.company}</span>
                                <span className="text-muted-foreground text-xs"> ({pos.duration})</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {intel.skills && intel.skills.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {intel.skills.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {intel.education && intel.education.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Education</p>
                        <ul className="list-disc list-inside text-sm">
                          {intel.education.map((edu, i) => (
                            <li key={i}>{edu}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Researched {new Date(intel.researchedAt).toLocaleDateString()}</span>
                      {editedBy && <span>Last edited by {editedBy}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {!lead.linkedInIntel && lead.contactLinkedIn && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <Linkedin className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-center text-sm mb-3">
                    Click the LinkedIn button above to research detailed career information
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      linkedInResearchMutation.mutate();
                      window.open(lead.contactLinkedIn!, "_blank");
                    }}
                    disabled={linkedInResearchMutation.isPending}
                    data-testid="button-linkedin-research-contact"
                  >
                    {linkedInResearchMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Researching...
                      </>
                    ) : (
                      <>
                        <Linkedin className="w-4 h-4" />
                        Research LinkedIn Profile
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* X.com Intel - Research from Twitter/X via xAI Grok */}
            {parsed?.xIntel && (() => {
              const xIntel = parsed.xIntel;
              const verificationStatus = (packet as ResearchPacket & { verificationStatus?: string }).verificationStatus;
              const isVerified = verificationStatus === "verified" || verificationStatus === "partially_verified";
              const lastEditedBy = (packet as ResearchPacket & { lastEditedBy?: string }).lastEditedBy;
              const contactXHandle = xIntelEdits.contactXHandle ?? xIntel.contactXHandle;
              const companyXHandle = xIntelEdits.companyXHandle ?? xIntel.companyXHandle;

              const handleSaveXIntel = () => {
                const updated: XIntelData = {
                  ...xIntel,
                  ...xIntelEdits
                };
                saveXIntelMutation.mutate(updated);
              };

              const handleCancelXIntel = () => {
                setEditingXIntel(false);
                setXIntelEdits({});
              };

              return (
              <Card className="border-sky-500/20 bg-sky-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Twitter className="w-4 h-4 text-sky-500" />
                      X.com Intel
                      {isVerified ? (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          AI Generated
                        </Badge>
                      )}
                    </CardTitle>
                    {!editingXIntel ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingXIntel(true)}
                        data-testid="button-edit-xintel"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelXIntel}
                          disabled={saveXIntelMutation.isPending}
                          data-testid="button-cancel-xintel"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveXIntel}
                          disabled={saveXIntelMutation.isPending}
                          data-testid="button-save-xintel"
                        >
                          {saveXIntelMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingXIntel ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <Label className="text-xs">Contact Handle</Label>
                        <Input
                          value={contactXHandle ?? ""}
                          onChange={(e) => setXIntelEdits({ ...xIntelEdits, contactXHandle: e.target.value || null })}
                          placeholder="@handle"
                          className="mt-1"
                          data-testid="input-x-contact-handle"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Company Handle</Label>
                        <Input
                          value={companyXHandle ?? ""}
                          onChange={(e) => setXIntelEdits({ ...xIntelEdits, companyXHandle: e.target.value || null })}
                          placeholder="@handle"
                          className="mt-1"
                          data-testid="input-x-company-handle"
                        />
                      </div>
                    </div>
                  ) : (contactXHandle || companyXHandle) ? (
                    <CardDescription className="flex gap-3">
                      {contactXHandle && (
                        <a 
                          href={`https://x.com/${contactXHandle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:underline"
                          data-testid="link-x-contact-handle"
                        >
                          {contactXHandle}
                        </a>
                      )}
                      {companyXHandle && (
                        <a 
                          href={`https://x.com/${companyXHandle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:underline"
                          data-testid="link-x-company-handle"
                        >
                          {companyXHandle}
                        </a>
                      )}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  {(xIntel.conversationStarters?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Conversation Starters from X</p>
                      <ul className="space-y-2">
                        {xIntel.conversationStarters!.map((starter, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <MessageSquare className="w-3 h-3 mt-1 text-sky-500" />
                            <span className="italic">&ldquo;{starter}&rdquo;</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(xIntel.contactRecentPosts?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Contact&apos;s Recent Posts</p>
                      <ul className="space-y-1">
                        {xIntel.contactRecentPosts!.map((post, i) => (
                          <li key={i} className="text-sm text-muted-foreground">{post}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(xIntel.contactTopics?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Topics They Discuss</p>
                      <div className="flex flex-wrap gap-1">
                        {xIntel.contactTopics!.map((topic, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(xIntel.industryTrends?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Industry Trends on X</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {xIntel.industryTrends!.map((trend, i) => (
                          <li key={i}>{trend}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(xIntel.relevantHashtags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {xIntel.relevantHashtags!.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs gap-1">
                          <Hash className="w-3 h-3" />
                          {tag.replace("#", "")}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {lastEditedBy && (
                    <p className="text-xs text-muted-foreground">Last edited by {lastEditedBy}</p>
                  )}
                </CardContent>
              </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="talktrack" className="mt-4 space-y-4">
            {packet?.talkTrack && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Opening Line
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic" data-testid="text-opener">&ldquo;{packet.talkTrack}&rdquo;</p>
                </CardContent>
              </Card>
            )}

            {parsed.discoveryQuestions.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Discovery Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2">
                    {parsed.discoveryQuestions.map((q: string, i: number) => (
                      <li key={i} className="text-sm">{q}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {parsed.objectionHandles.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Objection Handles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsed.objectionHandles.map((item, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium text-muted-foreground">If they say: &ldquo;{item.objection}&rdquo;</p>
                      <p className="text-sm mt-1">You say: &ldquo;{item.response}&rdquo;</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {lead.contactHistory && lead.contactHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Contact History ({lead.contactHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lead.contactHistory.slice(0, 5).map((contact) => (
                <div key={contact.id} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline">{contact.contactType}</Badge>
                  <span className="text-muted-foreground">{new Date(contact.createdAt).toLocaleDateString()}</span>
                  <span className="truncate">{contact.notes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <LeadQaPanel leadId={lead.id} />
    </div>
  );
}

function LeadQaPanel({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  
  const { data: qaThreads = [], isLoading } = useQuery<LeadQaThread[]>({
    queryKey: ["/api/leads", leadId, "qa"],
  });

  const askMutation = useMutation({
    mutationFn: async ({ question, webSearch }: { question: string; webSearch: boolean }) => {
      return apiRequest("POST", `/api/leads/${leadId}/qa`, { question, webSearch });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "qa"] });
      setQuestion("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to get answer", description: error.message, variant: "destructive" });
    },
  });

  const quickQuestions = [
    "What's the direct phone number?",
    "Who else should I contact?",
    "Any recent company news?",
    "What competitors do they use?",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askMutation.mutate({ question: question.trim(), webSearch });
    }
  };

  const handleQuickQuestion = (q: string) => {
    askMutation.mutate({ question: q, webSearch: true });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Ask AI About This Lead
        </CardTitle>
        <CardDescription>
          Get deeper research with AI-powered Q&A
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              onClick={() => handleQuickQuestion(q)}
              disabled={askMutation.isPending}
              data-testid={`button-quick-${q.substring(0, 10).replace(/\s/g, "-")}`}
            >
              {q}
            </Button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this lead..."
            disabled={askMutation.isPending}
            data-testid="input-qa-question"
          />
          <Button 
            type="submit" 
            disabled={!question.trim() || askMutation.isPending}
            data-testid="button-qa-submit"
          >
            {askMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Switch
            id="web-search"
            checked={webSearch}
            onCheckedChange={setWebSearch}
            data-testid="switch-web-search"
          />
          <Label htmlFor="web-search" className="text-sm text-muted-foreground cursor-pointer">
            Enable web search for real-time lookups
          </Label>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading Q&A history...</span>
          </div>
        )}

        {qaThreads.length > 0 && (
          <div className="space-y-3 pt-2">
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Q&A</p>
            {qaThreads.map((thread) => (
              <div key={thread.id} className="space-y-1 p-3 rounded-md bg-muted/50">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Q:</span>
                  <p className="text-sm font-medium">{thread.question}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground">A:</span>
                  <p className="text-sm text-muted-foreground">{thread.answer}</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {thread.webSearchUsed && (
                    <Badge variant="secondary" className="text-xs">Web Search</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(thread.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SortField = "fitScore" | "companyName" | "createdAt";
type SortDir = "asc" | "desc";

// Generic email domains that typically indicate personal/low-quality leads
const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com', 'msn.com', 'ymail.com',
  'mail.com', 'protonmail.com', 'zoho.com', 'gmx.com', 'inbox.com'
];

function isGenericEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return GENERIC_EMAIL_DOMAINS.includes(domain);
}

export default function LeadIntelPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [hideGenericEmails, setHideGenericEmails] = useState<boolean>(false);
  const [sortField, setSortField] = useState<SortField>("fitScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/leads/stats"],
  });

  const { data: selectedLead, isLoading: leadLoading } = useQuery<LeadWithDetails>({
    queryKey: ["/api/leads", selectedLeadId],
    enabled: !!selectedLeadId,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads/import");
      return res.json() as Promise<{ imported: number; duplicates: string[]; spreadsheetTitle?: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({
        title: "Import complete",
        description: `Imported ${data.imported} leads${data.spreadsheetTitle ? ` from "${data.spreadsheetTitle}"` : ""}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const bulkResearchMutation = useMutation({
    mutationFn: async (limit: number) => {
      const res = await apiRequest("POST", "/api/leads/bulk-research", { limit });
      return res.json() as Promise<{ message: string; processing: number; total: number; leadIds: string[] }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      if (data.processing === 0) {
        toast({ title: "No leads to research", description: "All leads have already been researched" });
      } else {
        toast({
          title: "Bulk research started",
          description: `Researching ${data.processing} leads in the background. Refresh to see progress.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Bulk research failed", description: error.message, variant: "destructive" });
    },
  });

  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter;
      const matchesEmailFilter = !hideGenericEmails || !isGenericEmail(lead.contactEmail);
      return matchesSearch && matchesStatus && matchesPriority && matchesEmailFilter;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "fitScore") {
        cmp = (a.fitScore ?? -1) - (b.fitScore ?? -1);
      } else if (sortField === "companyName") {
        cmp = a.companyName.localeCompare(b.companyName);
      } else if (sortField === "createdAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 md:p-4 border-b bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 md:mb-4">
          <div>
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Target className="w-5 h-5 md:w-6 md:h-6" />
              Lead Intel
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">AI-powered pre-call preparation</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <AddLeadForm onSuccess={() => {}} />
            <Button
              variant="outline"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              data-testid="button-import"
            >
              {importMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Import from Sheets</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={bulkResearchMutation.isPending}
                  data-testid="button-bulk-research"
                >
                  {bulkResearchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Research All</span>
                  <span className="sm:hidden">Research</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Research All Leads?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will use AI to research up to 10 unresearched leads. This operation uses significant API credits and may be expensive. Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-bulk-research">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => bulkResearchMutation.mutate(10)}
                    data-testid="button-confirm-bulk-research"
                  >
                    Yes, Research All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
                queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card
            className={`cursor-pointer hover-elevate ${statusFilter === "all" && priorityFilter === "all" ? "ring-2 ring-primary" : ""}`}
            onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); }}
            data-testid="card-stat-total"
          >
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold" data-testid="text-stat-total">{(stats as { total?: number })?.total || 0}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Total Leads</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer hover-elevate ${statusFilter === "researched" ? "ring-2 ring-green-500" : ""}`}
            onClick={() => { setStatusFilter("researched"); setPriorityFilter("all"); }}
            data-testid="card-stat-researched"
          >
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-stat-researched">
                {(stats as { byStatus?: Array<{ status: string; count: number }> })?.byStatus?.find((s) => s.status === "researched")?.count || 0}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Researched</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer hover-elevate ${statusFilter === "contacted" ? "ring-2 ring-purple-500" : ""}`}
            onClick={() => { setStatusFilter("contacted"); setPriorityFilter("all"); }}
            data-testid="card-stat-contacted"
          >
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-stat-contacted">
                {(stats as { byStatus?: Array<{ status: string; count: number }> })?.byStatus?.find((s) => s.status === "contacted")?.count || 0}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Contacted</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer hover-elevate ${priorityFilter === "hot" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => { setPriorityFilter("hot"); setStatusFilter("all"); }}
            data-testid="card-stat-hot"
          >
            <CardContent className="p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-stat-hot">
                {(stats as { byPriority?: Array<{ priority: string; count: number }> })?.byPriority?.find((p) => p.priority === "hot")?.count || 0}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Hot Leads</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${isMobile && selectedLeadId ? "hidden" : "flex"} ${isMobile ? "w-full" : "w-80"} border-r flex-col`}>
          <div className="p-3 space-y-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {["all", "new", "researched", "contacted", "follow_up"].map((status) => (
                <Badge
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => setStatusFilter(status)}
                  data-testid={`filter-status-${status}`}
                >
                  {status === "all" ? "All" : status.replace("_", " ")}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideGenericEmails}
                  onChange={(e) => setHideGenericEmails(e.target.checked)}
                  className="rounded border-muted-foreground"
                  data-testid="checkbox-hide-generic-emails"
                />
                <span className="text-muted-foreground">Hide generic emails</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="h-7 text-xs w-auto" data-testid="select-sort-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fitScore">Fit Score</SelectItem>
                  <SelectItem value="companyName">Company</SelectItem>
                  <SelectItem value="createdAt">Date Added</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                data-testid="button-sort-dir"
              >
                {sortDir === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">{filteredLeads.length} leads</span>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {leadsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {leads.length === 0 ? "No leads yet. Import from Google Sheets to get started." : "No leads match your filters."}
              </div>
            ) : (
              <div className="divide-y">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isSelected={selectedLeadId === lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className={`${isMobile && !selectedLeadId ? "hidden" : "flex"} flex-1 flex-col overflow-auto`}>
          {isMobile && selectedLeadId && (
            <div className="p-3 border-b bg-background sticky top-0 z-10">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedLeadId(null)}
                data-testid="button-back-to-list"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to list
              </Button>
            </div>
          )}
          <div className="flex-1 p-3 md:p-4">
            {selectedLeadId ? (
              leadLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : selectedLead ? (
                <LeadBriefing lead={selectedLead} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Lead not found
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Target className="w-12 h-12 md:w-16 md:h-16 mb-4" />
                <p className="text-base md:text-lg font-medium">Select a lead to view briefing</p>
                <p className="text-xs md:text-sm">Choose from the list on the left or import new leads</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
