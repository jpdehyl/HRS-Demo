import { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildSystemPromptAsync, getCopilotPersona } from "./prompts/supportAgent.js";
import { storage } from "./storage.js";
import { HAWK_RIDGE_PRODUCTS, matchProductsToLead } from "./ai/productCatalog.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  userId?: string;
  userName?: string;
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

interface LeadTranscriptData {
  leadId: string;
  leadName: string;
  companyName: string;
  calls: Array<{
    callId: string;
    callDate: Date;
    duration: number | null;
    disposition: string | null;
    sdrName: string;
    transcriptPreview: string;
    objections: string[];
    rebuttals: string[];
    coachingNotes: string | null;
  }>;
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
  // Manager-only: team data
  teamData?: {
    sdrs: SdrPerformance[];
    teamTotalCalls: number;
    teamTotalLeads: number;
    teamQualifiedLeads: number;
    topPerformer?: string;
  };
  // Lead transcript data (for manager queries about specific leads)
  leadTranscripts?: LeadTranscriptData;
}

interface SupportChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  userContext?: {
    userId?: number;
    currentPage?: string;
    userRole?: string;
  };
  includeUserData?: boolean;
}

interface SupportChatResponse {
  response: string;
  timestamp: string;
  userData?: UserContextData;
  dataIntent?: string;
}

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Keywords that indicate user wants to see their data - organized by role access
const DATA_INTENT_KEYWORDS = {
  // Available to all roles
  leads: ["my leads", "show leads", "list leads", "see leads", "view leads", "leads i have", "assigned leads", "current leads", "pipeline"],
  calls: ["my calls", "recent calls", "call history", "calls today", "show calls", "view calls", "call log"],
  stats: ["my stats", "my metrics", "how am i doing", "my performance", "my numbers", "my kpis"],

  // Performance questions (context-aware based on role)
  performance: ["performance", "performing", "conversion rate", "connection rate", "qualification rate", "call volume", "benchmarks", "targets", "goals"],

  // Product questions (available to all)
  products: ["product", "solidworks", "camworks", "3dexperience", "stratasys", "markforged", "driveworks", "pdm", "simulation", "which product", "recommend product", "pain point"],

  // Manager-only intents
  team: ["team", "my sdrs", "sdr performance", "team metrics", "team stats", "who is", "leaderboard", "top performer", "coaching"],
  
  // Lead transcript search - manager/admin only
  leadTranscripts: ["transcript", "rebuttal", "objection", "call with", "calls to", "last call", "their call", "'s call"],
};

// Extract potential lead name from message for transcript queries
function extractLeadName(message: string): string | null {
  // Patterns to extract lead names
  const patterns = [
    /(?:tell me about|show me|get|find)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)(?:'s)?\s+(?:call|transcript|rebuttal)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:'s)?\s+(?:last|recent|previous)?\s*(?:call|transcript|rebuttal)/i,
    /(?:call|transcript|rebuttal)s?\s+(?:for|with|to)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /(?:how did)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:handle|do)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

type DataIntent = "leads" | "calls" | "stats" | "performance" | "products" | "team" | "leadTranscripts" | null;

function detectDataIntent(message: string, userRole: string): DataIntent {
  const lowerMessage = message.toLowerCase();
  
  // Check for lead transcript intent first (manager/admin only)
  if ((userRole === "manager" || userRole === "admin")) {
    const leadName = extractLeadName(message);
    if (leadName && DATA_INTENT_KEYWORDS.leadTranscripts.some(keyword => lowerMessage.includes(keyword))) {
      return "leadTranscripts";
    }
  }

  // Check for team intent first (manager/admin only)
  if ((userRole === "manager" || userRole === "admin") &&
      DATA_INTENT_KEYWORDS.team.some(keyword => lowerMessage.includes(keyword))) {
    return "team";
  }

  // Check product questions
  if (DATA_INTENT_KEYWORDS.products.some(keyword => lowerMessage.includes(keyword))) {
    return "products";
  }

  // Check performance questions
  if (DATA_INTENT_KEYWORDS.performance.some(keyword => lowerMessage.includes(keyword))) {
    return "performance";
  }

  // Check standard data intents
  for (const [intent, keywords] of Object.entries(DATA_INTENT_KEYWORDS)) {
    if (intent === "team" || intent === "performance" || intent === "products") continue;
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return intent as DataIntent;
    }
  }

  return null;
}

async function fetchUserContextData(userId: string, userRole: string): Promise<UserContextData | null> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Get user's SDR ID if they are an SDR
    const sdrId = user.sdrId;

    // Fetch leads (for SDRs, get their assigned leads)
    let userLeads: any[] = [];
    if (sdrId) {
      userLeads = await storage.getLeadsBySdr(sdrId);
    }

    // Fetch recent calls
    const userCalls = await storage.getCallSessionsByUser(userId);
    const recentCalls = userCalls.slice(0, 10);

    const leadsThisWeek = userLeads.filter(lead => {
      const createdAt = new Date(lead.createdAt);
      return createdAt >= startOfWeek;
    }).length;

    const callsToday = userCalls.filter(call => {
      const callDate = new Date(call.startedAt);
      return callDate >= startOfDay;
    }).length;

    const callsThisWeek = userCalls.filter(call => {
      const callDate = new Date(call.startedAt);
      return callDate >= startOfWeek;
    }).length;

    const qualifiedLeads = userLeads.filter(lead =>
      lead.status === "qualified" || lead.status === "handed_off" || lead.status === "converted"
    ).length;

    // Calculate connection rate (calls with disposition != 'no_answer')
    const connectedCalls = userCalls.filter(call =>
      call.disposition && call.disposition !== "no_answer" && call.disposition !== "busy"
    ).length;
    const connectionRate = userCalls.length > 0 ? Math.round((connectedCalls / userCalls.length) * 100) : 0;

    // Calculate average call duration
    const callsWithDuration = userCalls.filter(call => call.duration && call.duration > 0);
    const avgCallDuration = callsWithDuration.length > 0
      ? Math.round(callsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0) / callsWithDuration.length / 60)
      : 0;

    // Format leads for response
    const leadSummaries: LeadSummary[] = userLeads.slice(0, 20).map(lead => ({
      id: lead.id,
      companyName: lead.companyName || "Unknown Company",
      contactName: lead.contactName || "Unknown Contact",
      status: lead.status || "new",
      fitScore: lead.fitScore,
      lastContact: lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : null,
      nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : null,
    }));

    // Format calls for response
    const callSummaries: CallSummary[] = recentCalls.map(call => ({
      id: call.id,
      leadName: null,
      duration: call.duration,
      disposition: call.disposition,
      date: new Date(call.startedAt).toLocaleDateString(),
    }));

    const result: UserContextData = {
      leads: leadSummaries,
      recentCalls: callSummaries,
      stats: {
        totalLeads: userLeads.length,
        leadsThisWeek,
        callsToday,
        callsThisWeek,
        qualifiedLeads,
        connectionRate,
        avgCallDuration,
      },
    };

    // Fetch team data for managers/admins
    if (userRole === "manager" || userRole === "admin") {
      const teamData = await fetchTeamData(user, userRole, startOfWeek, startOfDay);
      if (teamData) {
        result.teamData = teamData;
      }
    }

    return result;
  } catch (error) {
    console.error("[SupportChat] Error fetching user context:", error);
    return null;
  }
}

async function fetchTeamData(
  user: any,
  userRole: string,
  startOfWeek: Date,
  startOfDay: Date
): Promise<UserContextData["teamData"] | null> {
  try {
    // Get SDRs under this manager or all SDRs for admin
    let teamSdrs: any[] = [];

    if (userRole === "admin") {
      teamSdrs = await storage.getAllSdrs();
    } else if (user.managerId) {
      teamSdrs = await storage.getSdrsByManager(user.managerId);
    }

    if (teamSdrs.length === 0) return null;

    // Get user IDs for these SDRs
    const sdrIds = teamSdrs.map(sdr => sdr.id);
    const sdrUsers = await storage.getUsersBySdrIds(sdrIds);
    const userIds = sdrUsers.map(u => u.id);

    // Get all calls for team
    const teamCalls = await storage.getCallSessionsByUserIds(userIds);

    // Get all leads for team SDRs
    const allTeamLeads: any[] = [];
    for (const sdr of teamSdrs) {
      const sdrLeads = await storage.getLeadsBySdr(sdr.id);
      allTeamLeads.push(...sdrLeads.map(l => ({ ...l, sdrId: sdr.id, sdrName: sdr.name })));
    }

    // Calculate team stats
    const teamTotalCalls = teamCalls.length;
    const teamTotalLeads = allTeamLeads.length;
    const teamQualifiedLeads = allTeamLeads.filter(lead =>
      lead.status === "qualified" || lead.status === "handed_off" || lead.status === "converted"
    ).length;

    // Calculate per-SDR performance
    const sdrPerformance: SdrPerformance[] = teamSdrs.map(sdr => {
      const sdrUser = sdrUsers.find(u => u.sdrId === sdr.id);
      const sdrCalls = sdrUser ? teamCalls.filter(c => c.userId === sdrUser.id) : [];
      const sdrLeads = allTeamLeads.filter(l => l.sdrId === sdr.id);

      const callsToday = sdrCalls.filter(call => new Date(call.startedAt) >= startOfDay).length;
      const callsThisWeek = sdrCalls.filter(call => new Date(call.startedAt) >= startOfWeek).length;
      const qualifiedLeads = sdrLeads.filter(lead =>
        lead.status === "qualified" || lead.status === "handed_off" || lead.status === "converted"
      ).length;
      const connectedCalls = sdrCalls.filter(call =>
        call.disposition && call.disposition !== "no_answer" && call.disposition !== "busy"
      ).length;
      const connectionRate = sdrCalls.length > 0 ? Math.round((connectedCalls / sdrCalls.length) * 100) : 0;

      return {
        id: sdr.id,
        name: sdr.name,
        totalLeads: sdrLeads.length,
        totalCalls: sdrCalls.length,
        callsToday,
        callsThisWeek,
        qualifiedLeads,
        connectionRate,
      };
    });

    // Find top performer by calls this week
    const topPerformer = sdrPerformance.reduce((top, sdr) =>
      sdr.callsThisWeek > (top?.callsThisWeek || 0) ? sdr : top,
      sdrPerformance[0]
    );

    return {
      sdrs: sdrPerformance,
      teamTotalCalls,
      teamTotalLeads,
      teamQualifiedLeads,
      topPerformer: topPerformer?.name,
    };
  } catch (error) {
    console.error("[SupportChat] Error fetching team data:", error);
    return null;
  }
}

function formatUserDataForPrompt(data: UserContextData, intent: DataIntent, userRole: string): string {
  let formatted = "\n\n---\n**User's Current Data:**\n";

  // Individual stats (available to all)
  if (intent === "leads" || intent === "stats" || intent === "performance") {
    formatted += `\n**Your Leads Summary:**\n`;
    formatted += `- Total leads: ${data.stats.totalLeads}\n`;
    formatted += `- New leads this week: ${data.stats.leadsThisWeek}\n`;
    formatted += `- Qualified leads: ${data.stats.qualifiedLeads || 0}\n\n`;

    if (intent === "leads" && data.leads.length > 0) {
      formatted += `**Your Leads (${Math.min(data.leads.length, 10)} most recent):**\n`;
      data.leads.slice(0, 10).forEach((lead, i) => {
        formatted += `${i + 1}. **${lead.companyName}** - ${lead.contactName}\n`;
        formatted += `   Status: ${lead.status}${lead.fitScore ? ` | Fit Score: ${lead.fitScore}%` : ""}\n`;
        if (lead.nextFollowUp) {
          formatted += `   Next Follow-up: ${lead.nextFollowUp}\n`;
        }
      });
    } else if (intent === "leads") {
      formatted += `_No leads currently assigned._\n`;
    }
  }

  if (intent === "calls" || intent === "stats" || intent === "performance") {
    formatted += `\n**Your Calls Summary:**\n`;
    formatted += `- Calls today: ${data.stats.callsToday}\n`;
    formatted += `- Calls this week: ${data.stats.callsThisWeek}\n`;
    formatted += `- Connection rate: ${data.stats.connectionRate || 0}%\n`;
    formatted += `- Avg call duration: ${data.stats.avgCallDuration || 0} min\n\n`;

    if (intent === "calls" && data.recentCalls.length > 0) {
      formatted += `**Recent Calls:**\n`;
      data.recentCalls.slice(0, 5).forEach((call, i) => {
        const duration = call.duration ? `${Math.round(call.duration / 60)} min` : "N/A";
        formatted += `${i + 1}. ${call.date} - Duration: ${duration}`;
        if (call.disposition) {
          formatted += ` | ${call.disposition}`;
        }
        formatted += `\n`;
      });
    } else if (intent === "calls") {
      formatted += `_No recent calls._\n`;
    }
  }

  // Team data for managers/admins
  if ((userRole === "manager" || userRole === "admin") &&
      (intent === "team" || intent === "performance") &&
      data.teamData) {
    formatted += `\n**Team Overview:**\n`;
    formatted += `- Total team leads: ${data.teamData.teamTotalLeads}\n`;
    formatted += `- Total team calls: ${data.teamData.teamTotalCalls}\n`;
    formatted += `- Team qualified leads: ${data.teamData.teamQualifiedLeads}\n`;
    if (data.teamData.topPerformer) {
      formatted += `- Top performer this week: ${data.teamData.topPerformer}\n`;
    }
    formatted += `\n`;

    if (data.teamData.sdrs.length > 0) {
      formatted += `**SDR Performance:**\n`;
      data.teamData.sdrs.forEach((sdr, i) => {
        formatted += `${i + 1}. **${sdr.name}**\n`;
        formatted += `   Leads: ${sdr.totalLeads} | Calls this week: ${sdr.callsThisWeek}\n`;
        formatted += `   Qualified: ${sdr.qualifiedLeads} | Connection Rate: ${sdr.connectionRate}%\n`;
      });
    }
  }

  // Product context (only provide catalog info, not user data)
  if (intent === "products") {
    formatted += `\n**Product Matching Help:**\n`;
    formatted += `When discussing products with prospects, ask about:\n`;
    formatted += `- Their industry and company size\n`;
    formatted += `- Specific pain points (manual processes, design delays, compliance needs)\n`;
    formatted += `- Current tech stack (existing CAD, PDM, or manufacturing software)\n\n`;
    formatted += `The AI research dossier on each lead includes product recommendations based on their profile.\n`;
  }

  // Lead transcript data for managers querying about specific leads
  if (intent === "leadTranscripts" && data.leadTranscripts) {
    const lt = data.leadTranscripts;
    formatted += `\n**Call Transcripts for ${lt.leadName} at ${lt.companyName}:**\n`;
    
    if (lt.calls.length === 0) {
      formatted += `_No calls with transcripts found for this lead._\n`;
    } else {
      formatted += `Total calls with transcripts: ${lt.calls.length}\n\n`;
      
      for (const call of lt.calls.slice(0, 3)) {
        const duration = call.duration ? `${Math.round(call.duration / 60)} min` : "N/A";
        const callDate = new Date(call.callDate).toLocaleDateString();
        formatted += `**Call on ${callDate}** (${duration}, ${call.disposition || "unknown outcome"})\n`;
        formatted += `Called by: ${call.sdrName}\n`;
        
        if (call.objections.length > 0) {
          formatted += `\n**Objections raised:**\n`;
          for (const obj of call.objections) {
            formatted += `- "${obj}"\n`;
          }
        }
        
        if (call.rebuttals.length > 0) {
          formatted += `\n**SDR Rebuttals:**\n`;
          for (const reb of call.rebuttals) {
            formatted += `- "${reb}"\n`;
          }
        }
        
        if (call.transcriptPreview) {
          formatted += `\n**Transcript excerpt:**\n${call.transcriptPreview}\n`;
        }
        
        if (call.coachingNotes) {
          formatted += `\n**Coaching Analysis:**\n${call.coachingNotes.substring(0, 500)}...\n`;
        }
        
        formatted += `\n---\n`;
      }
    }
  }

  formatted += "---\n";
  return formatted;
}

export function registerSupportRoutes(app: Express): void {
  // Get user context data endpoint
  app.get("/api/support/context", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      const userData = await fetchUserContextData(userId, user?.role || "sdr");
      if (!userData) {
        return res.status(404).json({ error: "User data not found" });
      }

      res.json(userData);
    } catch (error) {
      console.error("[SupportChat] Error fetching context:", error);
      res.status(500).json({ error: "Failed to fetch user context" });
    }
  });

  // Support chat endpoint with role-aware data injection
  app.post("/api/support/chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory = [], userContext, includeUserData } = req.body as SupportChatRequest;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get user role from session or context
      const userId = req.session?.userId;
      let userRole = userContext?.userRole || "sdr";

      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          userRole = user.role;
        }
      }

      // Detect data intent with role awareness
      const dataIntent = detectDataIntent(message, userRole);
      let userData: UserContextData | null = null;
      let enhancedMessage = message;

      // Fetch user data if they're asking for it or if explicitly requested
      if ((dataIntent || includeUserData) && userId) {
        userData = await fetchUserContextData(userId, userRole);

        // Special handling for lead transcript queries
        if (dataIntent === "leadTranscripts" && (userRole === "manager" || userRole === "admin")) {
          const leadName = extractLeadName(message);
          if (leadName) {
            try {
              const matchedLeads = await storage.searchLeadsByName(leadName);
              if (matchedLeads.length > 0) {
                const lead = matchedLeads[0];
                const calls = await storage.getCallsWithTranscriptsByLead(lead.id);
                
                // Extract objections and rebuttals from transcripts
                const callData = calls.map(call => {
                  const transcript = call.transcriptText || "";
                  const objections: string[] = [];
                  const rebuttals: string[] = [];
                  
                  const objectionPatterns = [
                    /(?:we're|we are)\s+(?:happy|satisfied|good)\s+(?:with|using)/gi,
                    /(?:not\s+interested|no\s+interest|don't\s+need)/gi,
                    /(?:budget|price|cost|expensive)/gi,
                    /(?:locked\s+into|contract|agreement)/gi,
                    /(?:check\s+with|ask|consult)\s+(?:my\s+)?(?:team|manager|boss)/gi,
                  ];
                  
                  const lines = transcript.split('\n');
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (!line.startsWith('SDR:')) {
                      for (const pattern of objectionPatterns) {
                        if (pattern.test(line.toLowerCase())) {
                          objections.push(line.trim());
                          // Get SDR response as rebuttal
                          if (i + 1 < lines.length && lines[i + 1].startsWith('SDR:')) {
                            rebuttals.push(lines[i + 1].trim());
                          }
                          pattern.lastIndex = 0;
                          break;
                        }
                      }
                    }
                  }
                  
                  return {
                    callId: call.id,
                    callDate: call.startedAt,
                    duration: call.duration,
                    disposition: call.disposition,
                    sdrName: call.sdrName || "Unknown",
                    transcriptPreview: transcript.substring(0, 500) + (transcript.length > 500 ? "..." : ""),
                    objections: objections.slice(0, 5),
                    rebuttals: rebuttals.slice(0, 5),
                    coachingNotes: call.coachingNotes,
                  };
                });
                
                if (userData) {
                  userData.leadTranscripts = {
                    leadId: lead.id,
                    leadName: lead.contactName,
                    companyName: lead.companyName,
                    calls: callData,
                  };
                }
              }
            } catch (err) {
              console.error("[SupportChat] Error fetching lead transcripts:", err);
            }
          }
        }

        if (userData && dataIntent) {
          // Append user data to the message for AI context
          enhancedMessage = message + formatUserDataForPrompt(userData, dataIntent, userRole);
        }
      }

      // Build the system prompt with user context (includes role-based knowledge + persona from Google Doc)
      const systemPrompt = await buildSystemPromptAsync({
        ...userContext,
        userRole,
      });

      // Build messages array for the API call
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

      // Add conversation history (limit to last 10 messages for context)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Add the current message (possibly enhanced with user data)
      messages.push({
        role: "user",
        content: enhancedMessage,
      });

      console.log(`[SupportChat] Processing message from ${userRole} user ${userId || "anonymous"}${dataIntent ? ` (data intent: ${dataIntent})` : ""}`);

      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000, // Increased for team data responses
        system: systemPrompt,
        messages: messages,
        temperature: 0.7,
      });

      // Extract text from response
      const textContent = response.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in response");
      }

      const result: SupportChatResponse = {
        response: textContent.text,
        timestamp: new Date().toISOString(),
        userData: dataIntent ? userData || undefined : undefined,
        dataIntent: dataIntent || undefined,
      };

      console.log(`[SupportChat] Response generated successfully for ${userRole}`);
      res.json(result);
    } catch (error) {
      console.error("[SupportChat] Error:", error);

      // Check if it's an API key error
      if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({
          error: "Support chat is temporarily unavailable. Please try again later or contact support@hawkridge.com",
        });
      }

      res.status(500).json({
        error: "Failed to process your message. Please try again or contact support@hawkridge.com",
      });
    }
  });

  // Health check for support service
  app.get("/api/support/status", (_req: Request, res: Response) => {
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    res.json({
      available: hasApiKey,
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // COPILOT INTELLIGENCE ENDPOINTS
  // ==========================================

  // Search transcripts - semantic search over call transcripts
  app.post("/api/copilot/search-transcripts", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { query, limit = 10 } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's call sessions with transcripts
      const callSessions = await storage.getCallSessionsByUser(userId);

      // Filter to calls with transcripts and search
      const callsWithTranscripts = callSessions.filter(call =>
        call.transcriptText && call.transcriptText.length > 0
      );

      // Simple keyword search (can be upgraded to vector search later)
      const searchTerms = query.toLowerCase().split(/\s+/);
      const searchResults = callsWithTranscripts
        .map(call => {
          const transcript = call.transcriptText?.toLowerCase() || "";
          const matchScore = searchTerms.reduce((score, term) => {
            const matches = (transcript.match(new RegExp(term, 'g')) || []).length;
            return score + matches;
          }, 0);

          return {
            callId: call.id,
            callSid: call.callSid,
            date: call.startedAt,
            duration: call.duration,
            disposition: call.disposition,
            matchScore,
            // Extract relevant snippet around first match
            snippet: extractTranscriptSnippet(call.transcriptText || "", searchTerms[0]),
            transcriptPreview: call.transcriptText?.substring(0, 200) + "...",
          };
        })
        .filter(result => result.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      res.json({
        query,
        totalResults: searchResults.length,
        results: searchResults,
      });
    } catch (error) {
      console.error("[Copilot] Transcript search error:", error);
      res.status(500).json({ error: "Failed to search transcripts" });
    }
  });

  // Search transcripts by lead name - for managers to review specific lead's call history
  app.post("/api/copilot/lead-transcripts", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only managers and admins can search all lead transcripts
      if (user.role !== "manager" && user.role !== "admin") {
        return res.status(403).json({ error: "Manager or admin access required" });
      }

      const { leadName, leadId, includeRebuttals = true } = req.body;
      
      let targetLeadId = leadId;
      let matchedLeads: any[] = [];

      // If leadName provided, search for leads by name
      if (leadName && !leadId) {
        matchedLeads = await storage.searchLeadsByName(leadName);
        if (matchedLeads.length === 0) {
          return res.json({
            leadName,
            found: false,
            message: `No leads found matching "${leadName}"`,
            results: [],
          });
        }
        targetLeadId = matchedLeads[0].id;
      }

      if (!targetLeadId) {
        return res.status(400).json({ error: "Either leadName or leadId is required" });
      }

      // Get calls with transcripts for this lead
      const calls = await storage.getCallsWithTranscriptsByLead(targetLeadId);

      // Extract objections and rebuttals from transcripts
      const results = calls.map(call => {
        const transcript = call.transcriptText || "";
        const rebuttals: string[] = [];
        const objections: string[] = [];

        if (includeRebuttals && transcript) {
          // Common objection patterns
          const objectionPatterns = [
            /(?:we're|we are)\s+(?:happy|satisfied|good)\s+(?:with|using)/gi,
            /(?:not\s+interested|no\s+interest|don't\s+need)/gi,
            /(?:budget|price|cost|expensive)/gi,
            /(?:locked\s+into|contract|agreement)/gi,
            /(?:check\s+with|ask|consult)\s+(?:my\s+)?(?:team|manager|boss)/gi,
            /(?:not\s+a\s+good\s+time|busy|later)/gi,
          ];

          // Extract objections from prospect lines
          const lines = transcript.split('\n');
          for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (!line.startsWith('SDR:') && !line.includes('SDR:')) {
              for (const pattern of objectionPatterns) {
                if (pattern.test(lowerLine)) {
                  objections.push(line.trim());
                  pattern.lastIndex = 0; // Reset regex
                  break;
                }
              }
            }
          }

          // Extract SDR rebuttal responses (lines after objections)
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('SDR:') && i > 0) {
              const prevLine = lines[i - 1];
              // Check if previous line was an objection
              for (const pattern of objectionPatterns) {
                if (pattern.test(prevLine.toLowerCase())) {
                  rebuttals.push(line.trim());
                  pattern.lastIndex = 0;
                  break;
                }
              }
            }
          }
        }

        return {
          callId: call.id,
          callDate: call.startedAt,
          duration: call.duration,
          disposition: call.disposition,
          sdrName: call.sdrName || "Unknown",
          leadName: call.leadName || "Unknown",
          companyName: call.companyName || "Unknown",
          sentimentScore: call.sentimentScore,
          transcriptPreview: transcript.substring(0, 500) + (transcript.length > 500 ? "..." : ""),
          fullTranscript: transcript,
          objections: objections.slice(0, 5),
          rebuttals: rebuttals.slice(0, 5),
          coachingNotes: call.coachingNotes,
          keyTakeaways: call.keyTakeaways,
        };
      });

      res.json({
        leadName: matchedLeads[0]?.contactName || leadName,
        companyName: matchedLeads[0]?.companyName,
        leadId: targetLeadId,
        found: true,
        totalCalls: results.length,
        results,
      });
    } catch (error) {
      console.error("[Copilot] Lead transcript search error:", error);
      res.status(500).json({ error: "Failed to search lead transcripts" });
    }
  });

  // Pre-call brief - get intelligence before a call
  app.get("/api/copilot/pre-call-brief/:leadId", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const leadId = req.params.leadId;
      const lead = await storage.getLead(leadId);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Get previous calls with this lead
      const allCalls = await storage.getCallSessionsByUser(userId);
      const leadCalls = allCalls.filter(call => call.leadId === leadId);

      // Get the lead's research packet
      const latestResearch = await storage.getResearchPacketByLead(leadId);

      // Analyze previous calls for patterns
      const previousCallSummaries = leadCalls.slice(0, 5).map(call => ({
        date: call.startedAt,
        duration: call.duration,
        disposition: call.disposition,
        summary: call.coachingNotes || call.keyTakeaways || "No notes",
        transcriptPreview: call.transcriptText?.substring(0, 300),
      }));

      // Extract objections and commitments from transcripts
      const objections: string[] = [];
      const commitments: string[] = [];

      for (const call of leadCalls) {
        if (call.transcriptText) {
          // Simple extraction - look for objection patterns
          const objectionPatterns = [
            /(?:too expensive|price is|budget|can't afford|costly)/gi,
            /(?:not interested|don't need|already have|happy with current)/gi,
            /(?:not the right time|busy|later|not now)/gi,
          ];

          for (const pattern of objectionPatterns) {
            const matches = call.transcriptText.match(pattern);
            if (matches) {
              objections.push(...matches.map(m => m.toLowerCase()));
            }
          }

          // Look for commitment patterns
          const commitmentPatterns = [
            /(?:send (?:me|you|them) (?:the |a )?(?:pricing|info|details|proposal))/gi,
            /(?:schedule|book|set up) (?:a )?(?:demo|meeting|call)/gi,
            /(?:follow up|get back|reach out) (?:on|by|next)/gi,
          ];

          for (const pattern of commitmentPatterns) {
            const matches = call.transcriptText.match(pattern);
            if (matches) {
              commitments.push(...matches);
            }
          }
        }
      }

      // Calculate days since last contact
      const lastCall = leadCalls[0];
      const daysSinceLastContact = lastCall
        ? Math.floor((Date.now() - new Date(lastCall.startedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Build the brief
      const brief = {
        lead: {
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          status: lead.status,
          fitScore: lead.fitScore,
        },
        previousCalls: {
          count: leadCalls.length,
          lastCallDate: lastCall?.startedAt || null,
          daysSinceLastContact,
          summaries: previousCallSummaries,
        },
        intelligence: {
          objectionHistory: Array.from(new Set(objections)).slice(0, 5),
          openCommitments: Array.from(new Set(commitments)).slice(0, 5),
          painPoints: latestResearch?.painPointsJson || [],
          productMatches: latestResearch?.productMatchesJson || [],
          talkTrack: latestResearch?.talkTrack || null,
          discoveryQuestions: latestResearch?.discoveryQuestions || null,
        },
        suggestions: generatePreCallSuggestions(lead, leadCalls, latestResearch, daysSinceLastContact),
      };

      res.json(brief);
    } catch (error) {
      console.error("[Copilot] Pre-call brief error:", error);
      res.status(500).json({ error: "Failed to generate pre-call brief" });
    }
  });

  // Risk alerts - proactive alerts for stale leads, missed follow-ups, etc.
  app.get("/api/copilot/alerts", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const alerts: CopilotAlert[] = [];
      const now = new Date();

      // Get user's leads
      let leads: any[] = [];
      if (user.sdrId) {
        leads = await storage.getLeadsBySdr(user.sdrId);
      }

      // Get recent calls
      const recentCalls = await storage.getCallSessionsByUser(userId);

      // Alert 1: Stale leads (not contacted in 5+ days)
      for (const lead of leads) {
        if (lead.status === "new" || lead.status === "contacted" || lead.status === "engaged") {
          const lastContact = lead.lastContactedAt ? new Date(lead.lastContactedAt) : null;
          const daysSinceContact = lastContact
            ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          if (daysSinceContact === null && lead.status === "new") {
            // Never contacted
            alerts.push({
              type: "stale_lead",
              severity: "medium",
              title: `New lead needs attention`,
              message: `${lead.companyName} (${lead.contactName}) hasn't been contacted yet`,
              leadId: lead.id,
              leadName: lead.companyName,
              actionText: "Call Now",
              actionUrl: `/call-prep/${lead.id}`,
            });
          } else if (daysSinceContact && daysSinceContact >= 5) {
            alerts.push({
              type: "stale_lead",
              severity: daysSinceContact >= 7 ? "high" : "medium",
              title: `Lead going cold`,
              message: `${lead.companyName} hasn't been contacted in ${daysSinceContact} days`,
              leadId: lead.id,
              leadName: lead.companyName,
              actionText: "Follow Up",
              actionUrl: `/call-prep/${lead.id}`,
            });
          }
        }

        // Alert 2: Missed follow-ups
        if (lead.nextFollowUp) {
          const followUpDate = new Date(lead.nextFollowUp);
          if (followUpDate < now) {
            const daysMissed = Math.floor((now.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24));
            alerts.push({
              type: "missed_followup",
              severity: daysMissed >= 2 ? "high" : "medium",
              title: `Missed follow-up`,
              message: `Follow-up with ${lead.companyName} was scheduled ${daysMissed} day${daysMissed > 1 ? 's' : ''} ago`,
              leadId: lead.id,
              leadName: lead.companyName,
              actionText: "Schedule",
              actionUrl: `/call-prep/${lead.id}`,
            });
          }
        }
      }

      // Alert 3: Hot leads that need attention
      const hotLeads = leads.filter(lead =>
        lead.fitScore && lead.fitScore >= 80 &&
        (lead.status === "new" || lead.status === "contacted")
      );

      for (const lead of hotLeads) {
        const existingAlert = alerts.find(a => a.leadId === lead.id);
        if (!existingAlert) {
          alerts.push({
            type: "hot_lead",
            severity: "medium",
            title: `High-fit lead ready`,
            message: `${lead.companyName} has a ${lead.fitScore}% fit score - prioritize this one!`,
            leadId: lead.id,
            leadName: lead.companyName,
            actionText: "View Lead",
            actionUrl: `/call-prep/${lead.id}`,
          });
        }
      }

      // Alert 4: Low activity today
      const callsToday = recentCalls.filter(call => {
        const callDate = new Date(call.startedAt);
        return callDate.toDateString() === now.toDateString();
      }).length;

      const currentHour = now.getHours();
      if (currentHour >= 10 && currentHour <= 16 && callsToday < 5) {
        alerts.push({
          type: "low_activity",
          severity: "low",
          title: `Low call volume today`,
          message: `You've made ${callsToday} calls today. Aim for 50+ dials for best results.`,
          actionText: "Start Calling",
          actionUrl: "/leads",
        });
      }

      // Sort by severity (high > medium > low)
      const severityOrder = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      res.json({
        alerts: alerts.slice(0, 10), // Limit to top 10 alerts
        totalAlerts: alerts.length,
        generatedAt: now.toISOString(),
      });
    } catch (error) {
      console.error("[Copilot] Alerts error:", error);
      res.status(500).json({ error: "Failed to generate alerts" });
    }
  });

  // Call patterns - analyze user's call patterns for insights
  app.get("/api/copilot/patterns", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get calls from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allCalls = await storage.getCallSessionsByUser(userId);
      const recentCalls = allCalls.filter(call =>
        new Date(call.startedAt) >= thirtyDaysAgo
      );

      if (recentCalls.length === 0) {
        return res.json({
          message: "Not enough call data yet. Make some calls to see patterns!",
          patterns: null,
        });
      }

      // Calculate patterns
      const totalCalls = recentCalls.length;
      const connectedCalls = recentCalls.filter(call =>
        call.disposition && call.disposition !== "no_answer" && call.disposition !== "busy"
      );
      const connectionRate = Math.round((connectedCalls.length / totalCalls) * 100);

      // Calculate average duration for connected calls
      const callsWithDuration = connectedCalls.filter(call => call.duration && call.duration > 0);
      const avgDuration = callsWithDuration.length > 0
        ? Math.round(callsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0) / callsWithDuration.length / 60)
        : 0;

      // Analyze by day of week
      const dayStats: { [key: string]: { calls: number; connected: number } } = {};
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      for (const call of recentCalls) {
        const day = days[new Date(call.startedAt).getDay()];
        if (!dayStats[day]) {
          dayStats[day] = { calls: 0, connected: 0 };
        }
        dayStats[day].calls++;
        if (call.disposition && call.disposition !== "no_answer" && call.disposition !== "busy") {
          dayStats[day].connected++;
        }
      }

      // Find best day
      let bestDay = { day: "", rate: 0 };
      for (const [day, stats] of Object.entries(dayStats)) {
        const rate = stats.calls > 0 ? (stats.connected / stats.calls) * 100 : 0;
        if (rate > bestDay.rate && stats.calls >= 3) {
          bestDay = { day, rate: Math.round(rate) };
        }
      }

      // Analyze by hour
      const hourStats: { [key: number]: { calls: number; connected: number } } = {};
      for (const call of recentCalls) {
        const hour = new Date(call.startedAt).getHours();
        if (!hourStats[hour]) {
          hourStats[hour] = { calls: 0, connected: 0 };
        }
        hourStats[hour].calls++;
        if (call.disposition && call.disposition !== "no_answer" && call.disposition !== "busy") {
          hourStats[hour].connected++;
        }
      }

      // Find best time slots
      let bestTimeSlot = { hour: 0, rate: 0 };
      for (const [hour, stats] of Object.entries(hourStats)) {
        const rate = stats.calls > 0 ? (stats.connected / stats.calls) * 100 : 0;
        if (rate > bestTimeSlot.rate && stats.calls >= 3) {
          bestTimeSlot = { hour: parseInt(hour), rate: Math.round(rate) };
        }
      }

      // Generate insights
      const insights: string[] = [];

      if (connectionRate < 15) {
        insights.push("Your connection rate is below benchmark (15%). Try varying your call times.");
      } else if (connectionRate >= 25) {
        insights.push(`Great connection rate of ${connectionRate}%! You're above the 25% benchmark.`);
      }

      if (avgDuration < 2) {
        insights.push("Your calls average under 2 minutes. Try asking more discovery questions to extend conversations.");
      } else if (avgDuration >= 5) {
        insights.push(`Excellent average call duration of ${avgDuration} minutes. You're having quality conversations.`);
      }

      if (bestDay.day && bestDay.rate > 0) {
        insights.push(`Your best day is ${bestDay.day} with ${bestDay.rate}% connection rate.`);
      }

      if (bestTimeSlot.hour > 0) {
        const timeStr = bestTimeSlot.hour > 12 ? `${bestTimeSlot.hour - 12}pm` : `${bestTimeSlot.hour}am`;
        insights.push(`Your best calling time is around ${timeStr} with ${bestTimeSlot.rate}% connection rate.`);
      }

      res.json({
        period: "Last 30 days",
        patterns: {
          totalCalls,
          connectedCalls: connectedCalls.length,
          connectionRate,
          avgDurationMinutes: avgDuration,
          bestDay: bestDay.day || null,
          bestDayRate: bestDay.rate || null,
          bestHour: bestTimeSlot.hour || null,
          bestHourRate: bestTimeSlot.rate || null,
          callsByDay: dayStats,
          callsByHour: hourStats,
        },
        insights,
        benchmarks: {
          targetConnectionRate: "15-25%",
          targetCallDuration: "3-5 min",
          targetDailyDials: "50-80",
        },
      });
    } catch (error) {
      console.error("[Copilot] Patterns error:", error);
      res.status(500).json({ error: "Failed to analyze patterns" });
    }
  });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

interface CopilotAlert {
  type: "stale_lead" | "missed_followup" | "hot_lead" | "low_activity" | "deal_risk";
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  leadId?: string;
  leadName?: string;
  actionText: string;
  actionUrl: string;
}

function extractTranscriptSnippet(transcript: string, searchTerm: string, contextLength: number = 100): string {
  const lowerTranscript = transcript.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerTranscript.indexOf(lowerTerm);

  if (index === -1) return transcript.substring(0, 200) + "...";

  const start = Math.max(0, index - contextLength);
  const end = Math.min(transcript.length, index + searchTerm.length + contextLength);

  let snippet = "";
  if (start > 0) snippet += "...";
  snippet += transcript.substring(start, end);
  if (end < transcript.length) snippet += "...";

  return snippet;
}

function generatePreCallSuggestions(
  lead: any,
  previousCalls: any[],
  research: any,
  daysSinceLastContact: number | null
): string[] {
  const suggestions: string[] = [];

  // Suggestion based on time since last contact
  if (daysSinceLastContact === null) {
    suggestions.push("This is a new lead - review the research dossier and prepare 3 personalized discovery questions.");
  } else if (daysSinceLastContact > 7) {
    suggestions.push(`It's been ${daysSinceLastContact} days - re-establish rapport before diving into business.`);
  } else if (daysSinceLastContact <= 2) {
    suggestions.push("Recent contact - reference your last conversation and any commitments made.");
  }

  // Suggestion based on fit score
  if (lead.fitScore >= 80) {
    suggestions.push("High-fit lead! Focus on understanding their timeline and decision process.");
  } else if (lead.fitScore < 50) {
    suggestions.push("Lower fit score - qualify thoroughly to ensure this is worth pursuing.");
  }

  // Suggestion based on status
  if (lead.status === "contacted") {
    suggestions.push("Move toward qualification - try to uncover Budget, Authority, Need, and Timeline.");
  } else if (lead.status === "engaged") {
    suggestions.push("They're engaged! Focus on advancing to next steps - demo, proposal, or meeting.");
  }

  // Suggestion based on research
  if (research?.painPointsJson && research.painPointsJson.length > 0) {
    const topPain = research.painPointsJson[0];
    if (typeof topPain === 'object' && topPain.title) {
      suggestions.push(`Lead with their pain point: "${topPain.title}"`);
    } else if (typeof topPain === 'string') {
      suggestions.push(`Lead with their pain point: "${topPain}"`);
    }
  }

  return suggestions.slice(0, 4); // Limit to 4 suggestions
}
