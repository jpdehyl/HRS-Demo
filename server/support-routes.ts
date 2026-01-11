import { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/supportAgent.js";
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
};

type DataIntent = "leads" | "calls" | "stats" | "performance" | "products" | "team" | null;

function detectDataIntent(message: string, userRole: string): DataIntent {
  const lowerMessage = message.toLowerCase();

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

        if (userData && dataIntent) {
          // Append user data to the message for AI context
          enhancedMessage = message + formatUserDataForPrompt(userData, dataIntent, userRole);
        }
      }

      // Build the system prompt with user context (includes role-based knowledge)
      const systemPrompt = buildSystemPrompt({
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
}
