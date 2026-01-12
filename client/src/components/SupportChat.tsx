import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  Sparkles,
  AlertCircle,
  Search,
  Mic,
  User,
  Minimize2,
  Building2,
  Phone,
  BarChart3,
  Users,
  ChevronRight,
  Clock,
  Target,
  TrendingUp,
  Award,
  Package,
  HelpCircle,
  Compass,
  Brain,
  Palette,
} from "lucide-react";
import { useAgents, AGENTS, AgentType, AgentResponse } from "@/hooks/use-agents";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  userData?: UserContextData;
  agentType?: AgentType;
  subAgentsUsed?: AgentType[];
}

interface LeadSummary {
  id: string;
  companyName: string;
  contactName: string;
  status: string;
  fitScore: number | null;
  lastContact: string | null;
  nextFollowUp: string | null;
}

interface CallSummary {
  id: string;
  leadName: string | null;
  duration: number | null;
  disposition: string | null;
  date: string;
}

interface SdrPerformance {
  id: string;
  name: string;
  totalLeads: number;
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  qualifiedLeads: number;
  connectionRate: number;
}

interface UserContextData {
  leads: LeadSummary[];
  recentCalls: CallSummary[];
  stats: {
    totalLeads: number;
    leadsThisWeek: number;
    callsToday: number;
    callsThisWeek: number;
    qualifiedLeads?: number;
    connectionRate?: number;
    avgCallDuration?: number;
  };
  teamData?: {
    sdrs: SdrPerformance[];
    teamTotalCalls: number;
    teamTotalLeads: number;
    teamQualifiedLeads: number;
    topPerformer?: string;
  };
}

interface SupportChatState {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = "leadintel_support_chat";
const MAX_STORED_MESSAGES = 50;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function loadMessagesFromStorage(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (e) {
    console.error("Failed to load chat messages from storage:", e);
  }
  return [];
}

function saveMessagesToStorage(messages: Message[]): void {
  try {
    // Don't store userData in localStorage to save space
    const toStore = messages.slice(-MAX_STORED_MESSAGES).map((msg) => ({
      ...msg,
      userData: undefined,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.error("Failed to save chat messages to storage:", e);
  }
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  engaged: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  handed_off: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

function LeadCard({ lead, onNavigate }: { lead: LeadSummary; onNavigate: (id: string) => void }) {
  return (
    <button
      onClick={() => onNavigate(lead.id)}
      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm truncate">{lead.companyName}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{lead.contactName}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusColors[lead.status] || "")}>
            {lead.status}
          </Badge>
          {lead.fitScore && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{lead.fitScore}%</span>
            </div>
          )}
        </div>
      </div>
      {lead.nextFollowUp && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Follow-up: {lead.nextFollowUp}</span>
        </div>
      )}
    </button>
  );
}

function SdrCard({ sdr }: { sdr: SdrPerformance }) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{sdr.name}</span>
        {sdr.connectionRate >= 20 && (
          <Award className="h-4 w-4 text-yellow-500" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
        <div>
          <span className="text-muted-foreground">Calls/Week:</span>
          <span className="ml-1 font-medium">{sdr.callsThisWeek}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Leads:</span>
          <span className="ml-1 font-medium">{sdr.totalLeads}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Qualified:</span>
          <span className="ml-1 font-medium">{sdr.qualifiedLeads}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Connect %:</span>
          <span className={cn("ml-1 font-medium", sdr.connectionRate >= 20 ? "text-green-600" : "")}>
            {sdr.connectionRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

function TeamDataDisplay({ teamData }: { teamData: NonNullable<UserContextData["teamData"]> }) {
  return (
    <div className="space-y-3 mt-2">
      {/* Team Stats Overview */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-blue-500/10 border">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium">{teamData.teamTotalLeads} Team Leads</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {teamData.teamQualifiedLeads} qualified
          </p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium">{teamData.teamTotalCalls} Team Calls</span>
          </div>
          {teamData.topPerformer && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Top: {teamData.topPerformer}
            </p>
          )}
        </div>
      </div>

      {/* SDR Performance Cards */}
      {teamData.sdrs.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">SDR Performance</span>
          <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
            {teamData.sdrs.map((sdr) => (
              <SdrCard key={sdr.id} sdr={sdr} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserDataDisplay({ data, onNavigateToLead, userRole }: {
  data: UserContextData;
  onNavigateToLead: (id: string) => void;
  userRole?: string;
}) {
  const [, setLocation] = useLocation();

  const handleNavigate = (leadId: string) => {
    setLocation(`/call-prep/${leadId}`);
  };

  const isManager = userRole === "manager" || userRole === "admin";

  return (
    <div className="space-y-3 mt-2">
      {/* Individual Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-primary/10 border">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{data.stats.totalLeads} Leads</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            +{data.stats.leadsThisWeek} this week
          </p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium">{data.stats.callsToday} Calls Today</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {data.stats.callsThisWeek} this week
          </p>
        </div>
      </div>

      {/* Performance Stats (if available) */}
      {(data.stats.connectionRate !== undefined || data.stats.qualifiedLeads !== undefined) && (
        <div className="grid grid-cols-3 gap-2">
          {data.stats.qualifiedLeads !== undefined && (
            <div className="p-2 rounded-lg bg-muted/50 border text-center">
              <span className="text-lg font-bold text-green-600">{data.stats.qualifiedLeads}</span>
              <p className="text-[10px] text-muted-foreground">Qualified</p>
            </div>
          )}
          {data.stats.connectionRate !== undefined && (
            <div className="p-2 rounded-lg bg-muted/50 border text-center">
              <span className="text-lg font-bold">{data.stats.connectionRate}%</span>
              <p className="text-[10px] text-muted-foreground">Connect Rate</p>
            </div>
          )}
          {data.stats.avgCallDuration !== undefined && (
            <div className="p-2 rounded-lg bg-muted/50 border text-center">
              <span className="text-lg font-bold">{data.stats.avgCallDuration}m</span>
              <p className="text-[10px] text-muted-foreground">Avg Duration</p>
            </div>
          )}
        </div>
      )}

      {/* Team Data (Manager/Admin only) */}
      {isManager && data.teamData && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Team Overview</span>
          </div>
          <TeamDataDisplay teamData={data.teamData} />
        </div>
      )}

      {/* Leads List */}
      {data.leads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Your Leads</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setLocation("/leads")}
            >
              View All <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {data.leads.slice(0, 5).map((lead) => (
              <LeadCard key={lead.id} lead={lead} onNavigate={handleNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Calls */}
      {data.recentCalls.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Recent Calls</span>
          <div className="mt-2 space-y-1">
            {data.recentCalls.slice(0, 3).map((call) => (
              <div key={call.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                <span>{call.date}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {call.duration ? `${Math.round(call.duration / 60)}m` : "N/A"}
                  </span>
                  {call.disposition && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {call.disposition}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Check if Web Speech API is available
const isSpeechRecognitionSupported = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export function SupportChat() {
  const { user, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [state, setState] = useState<SupportChatState>({
    isOpen: false,
    messages: [],
    isLoading: false,
    error: null,
  });
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("sage");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const { detectAgentFromMessage, getQuickActions } = useAgents();

  const isManager = user?.role === "manager" || user?.role === "admin";
  const agentQuickActions = getQuickActions(user?.role || "sdr");

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      setInputValue(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('[SupportChat] Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Toggle voice input
  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('[SupportChat] Failed to start speech recognition:', error);
      }
    }
  }, [isListening]);

  // Debug logging for support chat visibility
  useEffect(() => {
    console.log("[SupportChat] Auth state:", { user: user?.email, authLoading, hasUser: !!user });
  }, [user, authLoading]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const storedMessages = loadMessagesFromStorage();
    if (storedMessages.length > 0) {
      setState((prev) => ({ ...prev, messages: storedMessages }));
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (state.messages.length > 0) {
      saveMessagesToStorage(state.messages);
    }
  }, [state.messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages, state.isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (state.isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state.isOpen]);

  // Keyboard shortcut: Cmd/Ctrl + J to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+J (Mac) or Ctrl+J (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setState((prev) => ({ ...prev, isOpen: !prev.isOpen, error: null }));
      }
      // Also support Escape to close
      if (e.key === 'Escape' && state.isOpen) {
        setState((prev) => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isOpen]);

  const toggleChat = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen, error: null }));
  }, []);

  const sendMessage = useCallback(async (messageText?: string, forceAgent?: AgentType) => {
    const trimmedInput = (messageText || inputValue).trim();
    if (!trimmedInput || state.isLoading) return;

    // Detect if message contains @mention for agent routing
    const mentionedAgent = detectAgentFromMessage(trimmedInput);
    const agentToUse = forceAgent || mentionedAgent || selectedAgent;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: trimmedInput,
      timestamp: new Date(),
      agentType: agentToUse,
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));
    setInputValue("");

    try {
      // Build conversation history for context
      const conversationHistory = state.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Route to agents API for specialized agents, support API for Sage
      const useAgentApi = agentToUse !== "sage" || mentionedAgent;
      const apiEndpoint = useAgentApi ? "/api/agents/ask" : "/api/support/chat";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: trimmedInput,
          agentType: useAgentApi ? agentToUse : undefined,
          conversationHistory,
          userContext: {
            userId: user?.id,
            currentPage: location,
            userRole: user?.role,
          },
          includeUserData: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to send message");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(data.timestamp || new Date()),
        userData: data.userData,
        agentType: data.agentType || agentToUse,
        subAgentsUsed: data.subAgentsUsed,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      console.error("Support chat error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again.",
      }));
    }
  }, [inputValue, state.isLoading, state.messages, user, location, selectedAgent, detectAgentFromMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    sendMessage(action);
  }, [sendMessage]);

  const handleNavigateToLead = useCallback((leadId: string) => {
    setLocation(`/call-prep/${leadId}`);
    setState((prev) => ({ ...prev, isOpen: false }));
  }, [setLocation]);

  // Don't render if user is not authenticated
  if (!user) {
    console.log("[SupportChat] Not rendering - user is null, authLoading:", authLoading);
    return null;
  }
  console.log("[SupportChat] Rendering chat bubble for user:", user.email);

  // Role-specific quick action topics
  const quickTopics = isManager
    ? ["Team coaching", "Call review", "Performance benchmarks", "Salesforce sync"]
    : ["Lead research", "Call features", "Product recommendations", "Salesforce sync"];

  return (
    <>
      {/* Chat Window */}
      {state.isOpen && (
        <Card
          className={cn(
            "fixed z-[9998] shadow-lg flex flex-col",
            // Desktop: bottom-right corner, fixed size
            "bottom-20 left-auto right-4 w-[420px] h-[550px]",
            // Mobile: full width, taller
            "max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full max-sm:h-[80vh] max-sm:rounded-b-none"
          )}
        >
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Copilot</CardTitle>
              <Badge variant="secondary" className="text-[10px] px-1.5 font-mono">
                ⌘J
              </Badge>
              {isManager && (
                <Badge variant="outline" className="text-[10px] px-1.5">
                  Manager
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {state.messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChat}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Agent Selector */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30 shrink-0 overflow-x-auto">
            {AGENTS.map((agent) => (
              <Button
                key={agent.type}
                variant={selectedAgent === agent.type ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs whitespace-nowrap",
                  selectedAgent === agent.type && "bg-primary/10 text-primary"
                )}
                onClick={() => setSelectedAgent(agent.type)}
                title={agent.description}
              >
                <span className="mr-1">{agent.emoji}</span>
                {agent.name}
              </Button>
            ))}
          </div>

          {/* Messages Area */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div ref={scrollRef} className="p-4 space-y-4">
                {/* Welcome message if no messages */}
                {state.messages.length === 0 && !state.isLoading && (
                  <div className="text-center py-4 px-4">
                    {/* Agent-aware welcome */}
                    <div className="relative inline-block mb-3">
                      <span className="text-4xl">{AGENTS.find(a => a.type === selectedAgent)?.emoji || '🧙'}</span>
                      <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-yellow-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">
                      {AGENTS.find(a => a.type === selectedAgent)?.name || 'Sage'}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {AGENTS.find(a => a.type === selectedAgent)?.description}
                    </p>

                    {/* Agent-specific Quick Actions */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Quick actions:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {agentQuickActions.slice(0, 4).map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => sendMessage(action.message, action.agent)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>

                      {/* Standard quick actions for Sage */}
                      {selectedAgent === 'sage' && (
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleQuickAction("Show my leads")}
                          >
                            <Users className="h-3 w-3 mr-1.5" />
                            My Leads
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleQuickAction("Show my recent calls")}
                          >
                            <Phone className="h-3 w-3 mr-1.5" />
                            My Calls
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleQuickAction("How am I doing? Show my performance")}
                          >
                            <BarChart3 className="h-3 w-3 mr-1.5" />
                            My Stats
                          </Button>
                        </div>
                      )}

                      {/* Manager-specific quick actions */}
                      {isManager && (
                        <div className="flex flex-wrap gap-2 justify-center mt-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30"
                            onClick={() => handleQuickAction("Show team performance metrics")}
                          >
                            <TrendingUp className="h-3 w-3 mr-1.5" />
                            Team Metrics
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30"
                            onClick={() => handleQuickAction("Who is my top performer this week?")}
                          >
                            <Award className="h-3 w-3 mr-1.5" />
                            Top Performer
                          </Button>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground">Or ask about:</p>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {quickTopics.map((topic) => (
                            <Button
                              key={topic}
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => {
                                setInputValue(`How do I use ${topic.toLowerCase()}?`);
                                inputRef.current?.focus();
                              }}
                            >
                              {topic}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Product Help Button */}
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleQuickAction("What products should I recommend for a manufacturing company with design challenges?")}
                        >
                          <Package className="h-3 w-3 mr-1.5" />
                          Product Recommendations
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleQuickAction("What are good benchmarks for my role?")}
                        >
                          <HelpCircle className="h-3 w-3 mr-1.5" />
                          Performance Benchmarks
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {state.messages.map((message) => {
                  const agentInfo = message.agentType ? AGENTS.find(a => a.type === message.agentType) : null;
                  return (
                  <div key={message.id} className="space-y-2">
                    <div
                      className={cn(
                        "flex gap-2",
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                        title={agentInfo?.name}
                      >
                        {message.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : agentInfo ? (
                          <span>{agentInfo.emoji}</span>
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {/* Agent name badge for assistant messages */}
                        {message.role === "assistant" && agentInfo && agentInfo.type !== 'sage' && (
                          <div className="flex items-center gap-1 mb-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {agentInfo.emoji} {agentInfo.name}
                            </Badge>
                            {message.subAgentsUsed && message.subAgentsUsed.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                + {message.subAgentsUsed.map(a => AGENTS.find(ag => ag.type === a)?.emoji).join(' ')}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            message.role === "user"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>

                    {/* User Data Display */}
                    {message.role === "assistant" && message.userData && (
                      <div className="ml-9">
                        <UserDataDisplay
                          data={message.userData}
                          onNavigateToLead={handleNavigateToLead}
                          userRole={user?.role}
                        />
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* Loading indicator */}
                {state.isLoading && (
                  <div className="flex gap-2">
                    <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm">
                      {AGENTS.find(a => a.type === selectedAgent)?.emoji || <Bot className="h-4 w-4" />}
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {AGENTS.find(a => a.type === selectedAgent)?.name || 'Agent'} is thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {state.error && (
                  <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
                    {state.error}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input Area */}
          <div className="p-3 border-t shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : (isManager ? "Ask about team metrics, coaching..." : "Ask about leads, calls, products...")}
                disabled={state.isLoading || isListening}
                className={cn("flex-1", isListening && "border-red-500 animate-pulse")}
              />
              {/* Voice Input Button */}
              {isSpeechRecognitionSupported && (
                <Button
                  onClick={toggleVoiceInput}
                  disabled={state.isLoading}
                  size="icon"
                  variant={isListening ? "destructive" : "outline"}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
                </Button>
              )}
              {/* Send Button */}
              <Button
                onClick={() => sendMessage()}
                disabled={!inputValue.trim() || state.isLoading}
                size="icon"
              >
                {state.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isListening && (
              <p className="text-xs text-red-500 mt-1 text-center animate-pulse">
                🎙️ Listening... speak now
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Floating Chat Bubble */}
      <Button
        onClick={toggleChat}
        className={cn(
          "fixed z-[9999] h-14 w-14 rounded-full shadow-lg",
          state.isOpen && "max-sm:hidden"
        )}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          left: 'auto'
        }}
        size="icon"
      >
        {state.isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </>
  );
}
